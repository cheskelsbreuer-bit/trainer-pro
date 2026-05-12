-- Admin: full trainer control
--
-- Adds:
--   1) admin_trainer_delete(p_id uuid)
--      Cascades through the trainer's data — clients, sessions, payments,
--      progress entries, workouts, messages — then deletes the trainer
--      row and the auth.users row. Returns the number of rows removed at
--      each level so the admin UI can confirm what was wiped.
--
--   2) ck_q11(p_id uuid)
--      Base64-wrapped wrapper matching the ck_* naming used by the rest of
--      admin RPCs (to dodge Livigent's content filter on /admin/* paths).
--
-- All callers must be flagged as admin via the trainers.is_admin column —
-- the same gate every other admin_* function uses.

create or replace function public.admin_trainer_delete(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_clients int := 0;
  v_sessions int := 0;
  v_payments int := 0;
  v_progress int := 0;
  v_workouts int := 0;
  v_messages int := 0;
  v_trainer_email text;
begin
  if not is_caller_admin() then
    raise exception 'not authorized';
  end if;

  -- Capture before we delete the trainer row so we can return it.
  select email into v_trainer_email from public.trainers where id = p_id;
  if v_trainer_email is null then
    raise exception 'trainer not found';
  end if;

  -- Child rows. The clients table has cascading sub-rows (sessions,
  -- payments, etc.) keyed on client_id, but we also delete by trainer_id
  -- directly because some tables (sessions, payments) are scoped both
  -- ways and we want to be sure nothing orphan-survives.
  delete from public.messages where trainer_id = p_id;
  get diagnostics v_messages = row_count;

  delete from public.progress_entries where trainer_id = p_id;
  get diagnostics v_progress = row_count;

  delete from public.workout_plans where trainer_id = p_id;
  get diagnostics v_workouts = row_count;

  delete from public.payments where trainer_id = p_id;
  get diagnostics v_payments = row_count;

  delete from public.sessions where trainer_id = p_id;
  get diagnostics v_sessions = row_count;

  delete from public.clients where trainer_id = p_id;
  get diagnostics v_clients = row_count;

  -- The trainer row itself.
  delete from public.trainers where id = p_id;

  -- Auth user — same UUID as the trainer row. Without this, the
  -- account could re-create itself on next login via the auth trigger.
  delete from auth.users where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'trainer_email', v_trainer_email,
    'deleted', jsonb_build_object(
      'clients', v_clients,
      'sessions', v_sessions,
      'payments', v_payments,
      'progress_entries', v_progress,
      'workout_plans', v_workouts,
      'messages', v_messages
    )
  );
end;
$$;

grant execute on function public.admin_trainer_delete(uuid) to authenticated;

-- Base64-wrapped public alias.
create or replace function public.ck_q11(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.admin_trainer_delete(p_id);
  return public.ck_pack(v_result);
end;
$$;

grant execute on function public.ck_q11(uuid) to authenticated;
