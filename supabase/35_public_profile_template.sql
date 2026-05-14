-- Extend public_profile_info to also return the trainer's template_slugs
-- so the public profile page can pick the right themed layout
-- (nutrition_coach → editorial sage layout, martial_arts → dojo dark,
-- boxing_gym → fight-poster, etc.) instead of always rendering the
-- generic trainer profile.

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
         public_profile, default_packages, currency, timezone, template_slugs
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
      'timezone', t.timezone,
      'template_slugs', coalesce(t.template_slugs, '{}'::text[])
    ),
    'profile', t.public_profile,
    'packages', t.default_packages,
    'testimonials', testimonials_json
  );
end;
$$;

grant execute on function public.public_profile_info(text) to anon, authenticated;
