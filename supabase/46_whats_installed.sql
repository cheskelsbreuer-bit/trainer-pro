-- ============================================================================
-- TRAINER PRO — "Which of these did I already run?"
-- ============================================================================
-- Every one of these files is safe to run twice, so the honest answer has
-- always been "just run them all again". That is a poor answer when you are
-- half way down a list, can't remember where you stopped, and each one
-- looks identical in the SQL editor once it says Success.
--
-- So the app asks the database instead of asking you. This reads the
-- catalog — which functions exist, which policies are on which table — and
-- reports which of the setup files have landed. It reads nothing about
-- anybody's data and changes nothing at all.
--
-- Run this one first; it is what makes the rest self-reporting.
-- Idempotent.
-- ============================================================================

create or replace function public.admin_whats_installed()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  fn_exists boolean;
  patch_src text;
  has_41 boolean := false;
  has_42 boolean := false;
  has_43 boolean := false;
  has_45 boolean := false;
  has_col_grant boolean := false;
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- 41 — admin_trainer_patch learned about template_slugs. The only way to
  -- tell is to read the function body: the signature never changed.
  select exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'admin_trainer_patch'
  ) into fn_exists;
  if fn_exists then
    select pg_get_functiondef(p.oid) into patch_src
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'admin_trainer_patch'
     limit 1;
    has_41 := patch_src ilike '%template_slugs%';
  end if;

  -- 42 — the parent's blanket "FOR ALL" is gone and the three narrow
  -- policies are in its place.
  has_42 := exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = 'messages'
         and policyname = 'messages_client_insert'
    ) and not exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = 'messages'
         and policyname = 'messages_client_all'
    );

  -- …and the column grant that stops anyone rewriting a message body,
  -- which is the belt to that policy's braces.
  select exists (
    select 1 from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'messages'
       and column_name = 'read_at' and privilege_type = 'UPDATE'
       and grantee = 'authenticated'
  ) into has_col_grant;

  -- 43 — the snapshot behind the "what they've set up" report.
  has_43 := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'ck_q12'
  );

  -- 45 — looking inside an account: the target table and the read policy.
  has_45 := exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = 'admin_view_targets'
    ) and exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = 'trainers'
         and policyname = 'trainers_admin_read'
    );

  return jsonb_build_object(
    'sql_47', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'admin_clients_to_kids'
    ),
    'sql_41', has_41,
    'sql_42', has_42,
    'sql_42_column_grant', has_col_grant,
    'sql_43', has_43,
    'sql_44', true,   -- you are an admin, or this call would have refused
    'sql_45', has_45,
    'sql_46', true,   -- you are reading its answer
    'checked_at', to_jsonb(now())
  );
end;
$$;

grant execute on function public.admin_whats_installed() to authenticated;

create or replace function public.ck_q15() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.ck_pack(public.admin_whats_installed());
end;
$$;
grant execute on function public.ck_q15() to authenticated;
