-- ============================================================================
-- TRAINER PRO — Directory: support multi-select specialty filtering
-- ============================================================================
-- /find-trainers used to filter on a single specialty. Now clients can
-- check several at once (e.g. "general fitness" + "yoga / pilates") and we
-- want to return any trainer whose specialties overlap with the picks.
--
-- Drops the old single-specialty signature so callers can't accidentally
-- hit the stale version, then recreates with text[].
--
-- Idempotent. Run in Supabase SQL editor AFTER 19_directory.sql.
-- ============================================================================

drop function if exists public.list_directory_trainers(text, text);

create or replace function public.list_directory_trainers(
  p_area text default null,
  p_specialties text[] default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_rows jsonb;
begin
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
      and tr.onboarded_at is not null
      and (
        p_area is null
        or tr.service_area ilike '%' || p_area || '%'
      )
      and (
        -- No filter, or trainer's specialties overlap with the picked set.
        -- Postgres `&&` operator on text[] returns true when any element
        -- of the left array equals any element of the right.
        p_specialties is null
        or array_length(p_specialties, 1) is null
        or tr.specialties && p_specialties
      )
  ) sub;

  return result_rows;
end;
$$;

grant execute on function public.list_directory_trainers(text, text[]) to anon, authenticated;
