-- ============================================================================
-- TRAINER PRO — Package balance auto-decrement
-- ============================================================================
-- When a session flips to status='completed', decrement the client's
-- package_balance by 1 (floored at 0). When a completion is reversed, restore
-- the credit. When a completed session is deleted, restore the credit.
--
-- Idempotent: safe to re-run. Drops and recreates the function + triggers.
-- Run once in Supabase SQL editor.
-- ============================================================================

create or replace function public.session_balance_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_uuid uuid;
  delta integer := 0;
begin
  if tg_op = 'INSERT' then
    -- New row created already as 'completed' → decrement
    if new.status = 'completed' then
      delta := -1;
      client_uuid := new.client_id;
    end if;

  elsif tg_op = 'UPDATE' then
    -- Status flipped to/from 'completed'
    if new.status = 'completed' and old.status is distinct from 'completed' then
      delta := -1;
      client_uuid := new.client_id;
    elsif old.status = 'completed' and new.status is distinct from 'completed' then
      delta := 1;
      client_uuid := new.client_id;
    end if;

    -- If client_id was reassigned on a completed session, move the credit too.
    if old.status = 'completed' and new.status = 'completed' and old.client_id is distinct from new.client_id then
      update public.clients
        set package_balance = package_balance + 1
        where id = old.client_id;
      delta := -1;
      client_uuid := new.client_id;
    end if;

  elsif tg_op = 'DELETE' then
    -- Removed a completed session → restore the credit
    if old.status = 'completed' then
      delta := 1;
      client_uuid := old.client_id;
    end if;
  end if;

  if delta <> 0 and client_uuid is not null then
    update public.clients
      set package_balance = greatest(0, package_balance + delta)
      where id = client_uuid;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists session_balance_insert on public.sessions;
create trigger session_balance_insert
  after insert on public.sessions
  for each row execute function public.session_balance_after_change();

drop trigger if exists session_balance_update on public.sessions;
create trigger session_balance_update
  after update of status, client_id on public.sessions
  for each row execute function public.session_balance_after_change();

drop trigger if exists session_balance_delete on public.sessions;
create trigger session_balance_delete
  after delete on public.sessions
  for each row execute function public.session_balance_after_change();

-- ============================================================================
-- Optional: convenience view used by the UI to flag low-balance clients.
-- ============================================================================
create or replace view public.clients_with_balance_flag as
select
  c.*,
  case
    when c.package_balance = 0 then 'empty'
    when c.package_balance <= 2 then 'low'
    else 'ok'
  end as balance_flag
from public.clients c;

-- ============================================================================
-- DONE.
-- ============================================================================
