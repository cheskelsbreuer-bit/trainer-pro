-- ============================================================================
-- TRAINER PRO — Admin can move an account to a different app
-- ============================================================================
-- When someone signs up they pick a template, and that template decides
-- which app they land in (babysitting, coach, …). If they picked the wrong
-- one there was no way to fix it: admin_trainer_patch ignored
-- template_slugs. This teaches it that one field, so the admin page can
-- switch an account to the right app without touching the database by hand.
--
-- Everything else is unchanged, and the admin check is still the same one.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

create or replace function public.admin_trainer_patch(
  p_trainer_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slugs text[];
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- template_slugs arrives as a JSON array, e.g. ["babysitting"]. Anything
  -- else (absent, null, not an array) leaves the column alone.
  if jsonb_typeof(p_patch->'template_slugs') = 'array' then
    select array_agg(value::text)
      into v_slugs
      from jsonb_array_elements_text(p_patch->'template_slugs') as value
     where length(trim(value)) > 0;
  end if;

  update public.trainers set
    full_name = coalesce(p_patch->>'full_name', full_name),
    business_name = coalesce(p_patch->>'business_name', business_name),
    service_area = coalesce(p_patch->>'service_area', service_area),
    directory_listed = coalesce((p_patch->>'directory_listed')::boolean, directory_listed),
    booking_enabled = coalesce((p_patch->>'booking_enabled')::boolean, booking_enabled),
    template_slugs = coalesce(v_slugs, template_slugs),
    updated_at = now()
  where id = p_trainer_id;

  return public.admin_trainer_detail(p_trainer_id);
end;
$$;

grant execute on function public.admin_trainer_patch(uuid, jsonb) to authenticated;
