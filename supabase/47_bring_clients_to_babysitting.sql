-- ============================================================================
-- TRAINER PRO — Bring an account's existing people into the babysitting roster
-- ============================================================================
-- Someone signs up at trainerpro.coach, picks "Solo trainer" because that is
-- what the form offered, and starts adding people. Then they are sold the
-- babysitting app. Moving them across (41) changes which app opens — it does
-- not move the people they already typed in, because the babysitting roster
-- is every clients row carrying the marker tag 'bs:1' and theirs carry
-- nothing. They log in to the new app and find it empty, having entered
-- their whole roster once already.
--
-- This adds the marker. Nothing else about the row changes: same name, same
-- phone, same notes, same id, same history. It is the difference between a
-- row the babysitting app can see and one it filters out.
--
-- Reversible: pass p_undo => true to take the marker off again. Both
-- directions are idempotent and both report exactly which names they
-- touched, so an admin can see what they did rather than trust a number.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

create or replace function public.admin_clients_to_kids(
  p_id uuid,
  p_undo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  changed jsonb;
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.trainers where id = p_id) then
    raise exception 'No such account' using errcode = 'P0002';
  end if;

  if p_undo then
    with touched as (
      update public.clients
         set tags = array_remove(coalesce(tags, array[]::text[]), 'bs:1')
       where trainer_id = p_id
         and coalesce(tags, array[]::text[]) @> array['bs:1']
      returning full_name
    )
    select coalesce(jsonb_agg(full_name order by full_name), '[]'::jsonb)
      into changed from touched;
  else
    with touched as (
      update public.clients
         set tags = coalesce(tags, array[]::text[]) || array['bs:1']
       where trainer_id = p_id
         and not (coalesce(tags, array[]::text[]) @> array['bs:1'])
         -- Leave archived rows where they are: someone deliberately took
         -- them off the roster, and this should not quietly put them back.
         and coalesce(status, 'active') <> 'archived'
      returning full_name
    )
    select coalesce(jsonb_agg(full_name order by full_name), '[]'::jsonb)
      into changed from touched;
  end if;

  return jsonb_build_object(
    'ok', true,
    'undo', p_undo,
    'count', jsonb_array_length(changed),
    'names', changed
  );
end;
$$;

grant execute on function public.admin_clients_to_kids(uuid, boolean) to authenticated;

create or replace function public.ck_q16(p_id uuid, p_undo boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.ck_pack(public.admin_clients_to_kids(p_id, p_undo));
end;
$$;
grant execute on function public.ck_q16(uuid, boolean) to authenticated;
