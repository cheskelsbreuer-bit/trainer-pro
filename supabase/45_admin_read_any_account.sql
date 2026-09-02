-- ============================================================================
-- TRAINER PRO — An admin can read ONE account at a time. Never write to it.
-- ============================================================================
-- "Look inside their app" first shipped by fetching a snapshot of a
-- babysitting account and feeding it to the babysitting app by hand. That
-- worked, and it only ever worked for babysitting: an account in the 1-on-1
-- Coach app or the classic app opened the wrong screens and showed nothing,
-- because nobody had rerouted those pages' queries.
--
-- This does it at the right level. Every app already asks the database the
-- same question — "give me the rows for trainer X" — and the only reason an
-- admin got nothing back was that row-level security said no. Give admins a
-- read and the apps need no special case at all.
--
-- The obvious version of that is a policy saying "an admin may read
-- everything". Don't. Around eighteen queries in this codebase have no
-- WHERE of their own and lean on row-level security to narrow them — "all
-- my payments", "all my clients". Under a read-everything policy those
-- quietly become "everybody's payments" the moment an admin opens their own
-- app. One forgotten filter would then be a cross-account leak.
--
-- So the read is narrowed to exactly one account: the one the admin has
-- opened. They declare it (ck_q13), the policies check it, and every one of
-- those eighteen queries keeps meaning what it says. Close the window
-- (ck_q14) and an admin can read nothing but their own rows again.
--
-- Two things this deliberately does NOT do:
--   · No INSERT, UPDATE or DELETE policy is added anywhere. An admin can
--     read one account and write to none. That is the read-only guarantee,
--     held by the database rather than by which buttons are on screen.
--   · It does not touch any existing policy. These sit alongside the
--     owner's own, so what a trainer or a parent can reach is unchanged.
--
-- What the account's owner sees: nothing. The row recording the visit is in
-- an admin-only table they have no policy to read, no email is sent, and
-- nothing in their own data is touched.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

-- A policy runs per row. A VOLATILE function inside one is re-evaluated for
-- every row of every scan; a STABLE one is evaluated once per statement.
-- This was never marked, so it defaulted to volatile.
create or replace function public.is_caller_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.trainers where id = auth.uid()), false);
$$;

grant execute on function public.is_caller_admin() to authenticated;

-- ── Which account is this admin looking at right now ──────────────────
-- One row per admin, replaced each time they open a different account.
create table if not exists public.admin_view_targets (
  admin_id   uuid primary key references auth.users(id) on delete cascade,
  target_id  uuid not null references public.trainers(id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.admin_view_targets enable row level security;

-- An admin may see their own row and nobody else's. The account being
-- looked at has no policy here at all, so it cannot see that it is.
drop policy if exists admin_view_targets_own on public.admin_view_targets;
create policy admin_view_targets_own on public.admin_view_targets
  for select to authenticated
  using (admin_id = auth.uid() and public.is_caller_admin());

-- No insert/update/delete policy: the table is only ever written through
-- the two security-definer functions below, which check is_caller_admin().

create or replace function public.admin_view_target()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select target_id from public.admin_view_targets where admin_id = auth.uid();
$$;

grant execute on function public.admin_view_target() to authenticated;

-- ── Open and close the window ─────────────────────────────────────────
create or replace function public.admin_view_start(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.trainers where id = p_id) then
    raise exception 'No such account' using errcode = 'P0002';
  end if;
  -- Looking at yourself would be a no-op that muddies the audit trail.
  if p_id = auth.uid() then
    raise exception 'That is your own account' using errcode = '22023';
  end if;

  insert into public.admin_view_targets (admin_id, target_id)
       values (auth.uid(), p_id)
  on conflict (admin_id)
    do update set target_id = excluded.target_id, started_at = now();

  return jsonb_build_object('ok', true, 'target', p_id);
end;
$$;

grant execute on function public.admin_view_start(uuid) to authenticated;

create or replace function public.admin_view_stop()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_view_targets where admin_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

-- Deliberately open to any signed-in user: closing a window you do not have
-- is harmless, and it must never be possible to get stuck inside one.
grant execute on function public.admin_view_stop() to authenticated;

-- The generically-named pair the frontend calls, for the same reason as
-- ck_q1..ck_q12: the content filter on the owner's network reads URLs.
create or replace function public.ck_q13(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.admin_view_start(p_id);
end;
$$;
grant execute on function public.ck_q13(uuid) to authenticated;

create or replace function public.ck_q14() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.admin_view_stop();
end;
$$;
grant execute on function public.ck_q14() to authenticated;

-- ── The read, one account wide ────────────────────────────────────────
do $$
declare
  t text;
  owner_col text;
  tables text[] := array[
    'clients', 'payments', 'sessions', 'messages', 'activity_log',
    'workout_plans', 'workout_logs', 'progress_entries', 'exercises',
    'client_intakes', 'client_portal_invites', 'feedback', 'testimonials'
  ];
begin
  -- The trainers row itself is keyed on id, not trainer_id.
  execute 'drop policy if exists trainers_admin_read on public.trainers';
  execute 'create policy trainers_admin_read on public.trainers
             for select to authenticated
             using (public.is_caller_admin() and id = public.admin_view_target())';
  raise notice 'admin read enabled on trainers';

  foreach t in array tables loop
    -- Skip anything this database doesn't have; the schema has grown in
    -- steps and not every install is at the same one.
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      raise notice 'skipping %, no such table', t;
      continue;
    end if;

    select column_name into owner_col
      from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name = 'trainer_id';

    if owner_col is null then
      raise notice 'skipping %, no trainer_id column', t;
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_caller_admin() and trainer_id = public.admin_view_target())',
      t || '_admin_read', t
    );
    raise notice 'admin read enabled on %', t;
  end loop;
end;
$$;

-- What you should see: one "admin read enabled on …" notice per table, plus
-- a "skipping" notice for anything this database doesn't have. Both fine.
--
-- To take it all away again:
--   do $$ declare t text; begin
--     foreach t in array array['trainers','clients','payments','sessions','messages',
--       'activity_log','workout_plans','workout_logs','progress_entries','exercises',
--       'client_intakes','client_portal_invites','feedback','testimonials']
--     loop execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
--     end loop; end $$;
--   drop table if exists public.admin_view_targets cascade;
