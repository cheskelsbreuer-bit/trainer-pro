-- ============================================================================
-- TRAINER PRO — Client intake forms with e-signature
-- ============================================================================
-- New trainers send each new client a one-time link. The client fills health/
-- goals/contact info, types/draws a signature, submits. The signed data lives
-- on the intake row + flows into clients.* fields automatically.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.client_intakes (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    -- One-time URL token. Random, ~22 chars base64.
    token text not null unique,
    -- Status: 'pending' until client submits, then 'completed'. 'expired' if past expires_at.
    status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
    -- Free-form payload — exactly what the client typed/answered.
    submitted_data jsonb,
    -- The signature image as a data URL ("data:image/png;base64,...")
    signature_data_url text,
    -- The text of the waiver they agreed to (snapshotted at sign time)
    waiver_text text,
    submitted_at timestamptz,
    expires_at timestamptz default (now() + interval '14 days'),
    created_at timestamptz default now()
);

create index if not exists client_intakes_trainer_idx on public.client_intakes(trainer_id);
create index if not exists client_intakes_client_idx on public.client_intakes(client_id);

alter table public.client_intakes enable row level security;

-- Trainer can manage their own intake rows
drop policy if exists intakes_trainer_all on public.client_intakes;
create policy intakes_trainer_all on public.client_intakes for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);

-- Public access happens via SECURITY DEFINER RPCs below — no anon RLS policy needed.

-- ============================================================================
-- Public read: anyone with a valid token sees the form metadata.
-- Returns null if token is invalid, expired, or already submitted.
-- ============================================================================
create or replace function public.public_intake_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i record;
  t record;
  c record;
begin
  select * into i from public.client_intakes
   where token = p_token
   limit 1;

  if not found then return null; end if;

  -- Auto-expire if past expiry
  if i.status = 'pending' and i.expires_at < now() then
    update public.client_intakes set status = 'expired' where id = i.id;
    return jsonb_build_object('status', 'expired');
  end if;

  if i.status <> 'pending' then
    return jsonb_build_object('status', i.status);
  end if;

  select id, full_name, business_name, primary_color, logo_url
    into t from public.trainers where id = i.trainer_id;
  select id, full_name, email, phone
    into c from public.clients where id = i.client_id;

  return jsonb_build_object(
    'status', 'pending',
    'expires_at', i.expires_at,
    'trainer', jsonb_build_object(
      'full_name', t.full_name,
      'business_name', t.business_name,
      'primary_color', t.primary_color,
      'logo_url', t.logo_url
    ),
    'client', jsonb_build_object(
      'full_name', c.full_name,
      'email', c.email,
      'phone', c.phone
    )
  );
end;
$$;

grant execute on function public.public_intake_info(text) to anon, authenticated;

-- ============================================================================
-- Public submit: client posts the form + signature.
-- Updates the intake row AND syncs key fields onto the clients row.
-- ============================================================================
create or replace function public.public_intake_submit(
  p_token text,
  p_data jsonb,
  p_signature_data_url text,
  p_waiver_text text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i record;
begin
  select * into i from public.client_intakes
    where token = p_token and status = 'pending'
    limit 1;

  if not found then
    raise exception 'INTAKE_INVALID' using errcode = 'P0001';
  end if;

  if i.expires_at < now() then
    update public.client_intakes set status = 'expired' where id = i.id;
    raise exception 'INTAKE_EXPIRED' using errcode = 'P0001';
  end if;

  if p_signature_data_url is null or length(p_signature_data_url) < 50 then
    raise exception 'SIGNATURE_REQUIRED' using errcode = 'P0001';
  end if;

  -- Update the intake row
  update public.client_intakes
     set status = 'completed',
         submitted_data = p_data,
         signature_data_url = p_signature_data_url,
         waiver_text = p_waiver_text,
         submitted_at = now()
   where id = i.id;

  -- Sync key fields onto the client (so the rest of the app sees them).
  -- Only fill empties — don't overwrite anything the trainer already set.
  update public.clients
     set goals = coalesce(goals, p_data->>'goals'),
         medical_notes = coalesce(medical_notes, p_data->>'medical_notes'),
         emergency_contact = coalesce(emergency_contact, p_data->>'emergency_contact'),
         date_of_birth = coalesce(date_of_birth, (p_data->>'date_of_birth')::date),
         phone = coalesce(phone, p_data->>'phone')
   where id = i.client_id;

  return jsonb_build_object('ok', true, 'submitted_at', now());
end;
$$;

grant execute on function public.public_intake_submit(text, jsonb, text, text) to anon, authenticated;

-- ============================================================================
-- Token generator — short, URL-safe.
-- ============================================================================
create or replace function public.generate_intake_token()
returns text
language plpgsql
as $$
begin
  return replace(replace(replace(encode(gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '');
end;
$$;

-- ============================================================================
-- DONE.
-- ============================================================================
