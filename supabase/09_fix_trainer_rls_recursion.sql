-- ============================================================================
-- TRAINER PRO — Hotfix: trainer SELECT policy recursion
-- ============================================================================
-- Bug shipped in 07_studios.sql: the trainer_studio_peer_select policy on
-- public.trainers has an inline subquery that ALSO touches trainers, which
-- re-triggers the same policy, causing "infinite recursion detected in
-- policy for relation trainers" on every read of the trainers table.
--
-- Fix: wrap the studio-peer check in a SECURITY DEFINER helper function so
-- its body bypasses RLS (same pattern already used by is_my_data()).
--
-- Run this in Supabase SQL editor to unblock Settings + Dashboard.
-- ============================================================================

create or replace function public.shares_studio_with(other_trainer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trainers me
    join public.trainers them on them.studio_id = me.studio_id
    where me.id = auth.uid()
      and me.studio_id is not null
      and them.id = other_trainer
  )
$$;

grant execute on function public.shares_studio_with(uuid) to authenticated;

-- Replace the recursive policy
drop policy if exists trainer_studio_peer_select on public.trainers;
create policy trainer_studio_peer_select on public.trainers for select
  using (
    auth.uid() = id
    or public.shares_studio_with(id)
  );

-- ============================================================================
-- DONE.
-- ============================================================================
