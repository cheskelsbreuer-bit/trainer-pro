-- ============================================================================
-- TRAINER PRO — Public profile (the trainer's marketing front page)
-- ============================================================================
-- Adds:
--   * trainers.public_profile JSONB — hero, about, contact, gallery refs
--   * testimonials table — rotatable client quotes with optional photo + rating
--   * public-gallery storage bucket — public read, trainer write
--   * public_profile_info(slug) RPC — anon-readable, returns the full payload
--     for the marketing page in one shot
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

-- 1. Public profile JSONB on trainers ----------------------------------------
alter table public.trainers
  add column if not exists public_profile jsonb not null default jsonb_build_object(
    'hero', jsonb_build_object(
      'title', null,
      'subtitle', null,
      'photo_url', null,
      'cta_text', 'Book a free consultation'
    ),
    'about', jsonb_build_object(
      'headline', null,
      'body', null,
      'photo_url', null
    ),
    'contact', jsonb_build_object(
      'phone', null,
      'email', null,
      'instagram', null,
      'whatsapp', null,
      'address', null
    ),
    'gallery', '[]'::jsonb
  );

-- 2. Testimonials table ------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default uuid_generate_v4(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  studio_id uuid references public.studios(id) on delete cascade,
  client_name text not null,
  client_role text,
  client_photo_url text,
  body text not null,
  rating int default 5 check (rating between 1 and 5),
  display_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists testimonials_trainer_idx on public.testimonials(trainer_id);

drop trigger if exists touch_testimonials on public.testimonials;
create trigger touch_testimonials before update on public.testimonials
  for each row execute function public.touch_updated_at();

alter table public.testimonials enable row level security;

drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists testimonials_trainer_all on public.testimonials;
create policy testimonials_trainer_all on public.testimonials for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- 3. Public-facing photo bucket ----------------------------------------------
-- Different from progress-photos: this one is PUBLIC because it backs hero
-- images and gallery shots that need to render on a no-auth marketing page.
insert into storage.buckets (id, name, public)
  values ('public-gallery', 'public-gallery', true)
  on conflict (id) do nothing;

-- Convention: path = "{trainer_id}/{filename}"
drop policy if exists public_gallery_trainer_write on storage.objects;
create policy public_gallery_trainer_write on storage.objects for all
  to authenticated
  using (
    bucket_id = 'public-gallery'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'public-gallery'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  );

drop policy if exists public_gallery_anon_read on storage.objects;
create policy public_gallery_anon_read on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'public-gallery');

-- 4. Public profile RPC ------------------------------------------------------
create or replace function public.public_profile_info(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  testimonials_json jsonb;
begin
  select id, full_name, business_name, slug, primary_color, logo_url,
         public_profile, default_packages, currency, timezone
  into t
  from public.trainers
  where lower(slug) = lower(p_slug)
  limit 1;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', tt.id,
    'client_name', tt.client_name,
    'client_role', tt.client_role,
    'client_photo_url', tt.client_photo_url,
    'body', tt.body,
    'rating', tt.rating
  ) order by tt.display_order, tt.created_at desc), '[]'::jsonb)
  into testimonials_json
  from public.testimonials tt
  where tt.trainer_id = t.id and tt.is_published = true;

  return jsonb_build_object(
    'trainer', jsonb_build_object(
      'full_name', t.full_name,
      'business_name', t.business_name,
      'slug', t.slug,
      'primary_color', t.primary_color,
      'logo_url', t.logo_url,
      'currency', t.currency,
      'timezone', t.timezone
    ),
    'profile', t.public_profile,
    'packages', t.default_packages,
    'testimonials', testimonials_json
  );
end;
$$;

grant execute on function public.public_profile_info(text) to anon, authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
