-- ============================================================================
-- TRAINER PRO — Public trainer directory ("find a trainer near me")
-- ============================================================================
-- Adds:
--   * trainers.service_area text — free-form city/region the trainer covers
--   * trainers.directory_listed boolean — opt-out switch (default true so
--     anyone with a public profile + slug shows up automatically)
--   * list_directory_trainers(area text, specialty text) RPC — anon-readable,
--     returns the public-safe slice of each listed trainer's profile
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

alter table public.trainers
  add column if not exists service_area text,
  add column if not exists directory_listed boolean not null default true;

create index if not exists trainers_directory_listed_idx
  on public.trainers (directory_listed)
  where directory_listed = true;

-- ─── Public RPC: list trainers for the marketing-site directory ───
create or replace function public.list_directory_trainers(
  p_area text default null,
  p_specialty text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_rows jsonb;
begin
  -- Reference the subquery columns by qualifying with `sub` — the previous
  -- version said `jsonb_agg(t order by t.name)` which Postgres parsed as a
  -- table reference and threw "missing FROM-clause entry for table t".
  select coalesce(jsonb_agg(sub.payload order by sub.sort_name), '[]'::jsonb)
    into result_rows
  from (
    select
      jsonb_build_object(
        'id', tr.id,
        'slug', tr.slug,
        'name', tr.business_name,
        'full_name', tr.full_name,
        'primary_color', tr.primary_color,
        'logo_url', tr.logo_url,
        'service_area', tr.service_area,
        'specialties', tr.specialties,
        'headline', tr.public_profile->'hero'->>'title',
        'photo_url', tr.public_profile->'hero'->>'photo_url',
        'bio_snippet', left(coalesce(tr.public_profile->'about'->>'body', ''), 180)
      ) as payload,
      coalesce(tr.business_name, tr.full_name) as sort_name
    from public.trainers tr
    where tr.directory_listed = true
      and tr.slug is not null
      -- only show trainers who've finished onboarding so the cards aren't blank
      and tr.onboarded_at is not null
      and (
        p_area is null
        or tr.service_area ilike '%' || p_area || '%'
      )
      and (
        p_specialty is null
        or p_specialty = any(tr.specialties)
      )
  ) sub;

  return result_rows;
end;
$$;

grant execute on function public.list_directory_trainers(text, text) to anon, authenticated;

-- Allow anon to read only the public-safe columns of trainers via the RPC.
-- (RLS on trainers table is unchanged; this RPC uses security definer to
--  expose only the curated jsonb shape above.)
