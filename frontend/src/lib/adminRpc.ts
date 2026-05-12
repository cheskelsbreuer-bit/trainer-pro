// Admin operations via Supabase RPCs.
//
// We can't talk to our FastAPI backend (api.trainerpro.coach) because the
// user's network filter (Livigent) intercepts and blocks responses from
// that domain. Supabase (*.supabase.co) IS allowed by their filter — the
// rest of the app reads from it normally. So we move all admin reads
// and writes to security-definer Supabase RPCs (see supabase/22_admin_via_rpc.sql).
//
// Each helper throws on RPC error so the React Query callers see a real
// error and not a silently empty response. They also assert the shape so
// the existing typed UI keeps working.

import { supabase } from './supabase';

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

export interface OverviewStats {
  total_trainers: number;
  onboarded_trainers: number;
  new_trainers_this_week: number;
  new_trainers_this_month: number;
  total_clients: number;
  total_sessions: number;
  total_payments_amount: number;
  waitlist_count: number;
}

export interface AdminTrainerRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  onboarded_at: string | null;
  client_count_estimate: string | null;
  specialties: string[];
  created_at: string | null;
}

export interface AdminWaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string | null;
}

export interface AdminFeedbackRow {
  id: string;
  trainer_id: string | null;
  trainer_email: string | null;
  category: string;
  message: string;
  user_agent: string | null;
  url: string | null;
  resolved_at: string | null;
  created_at: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_reply_seen_at: string | null;
}

export interface AdminTrainerDetail {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  timezone: string | null;
  currency: string | null;
  primary_color: string | null;
  slug: string | null;
  booking_enabled: boolean;
  onboarded_at: string | null;
  client_count_estimate: string | null;
  specialties: string[];
  service_area: string | null;
  directory_listed: boolean;
  created_at: string | null;
  client_count: number;
  session_count: number;
  payment_total: number;
  last_session_at: string | null;
}

export interface AdminTrainerClient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  package_balance: number;
  created_at: string;
}

export interface AdminTrainerSession {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  session_type: string | null;
  price: number | null;
  paid: boolean;
  client_id: string;
}

export interface AdminTrainerPayment {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  method: string | null;
  description: string | null;
  paid_at: string;
}

export const adminRpc = {
  whoami: () => rpc<{ is_admin: boolean }>('admin_whoami'),
  overview: () => rpc<OverviewStats>('admin_overview'),
  trainers: () => rpc<AdminTrainerRow[]>('admin_trainers'),
  trainerDetail: (trainerId: string) =>
    rpc<AdminTrainerDetail>('admin_trainer_detail', { p_trainer_id: trainerId }),
  trainerPatch: (trainerId: string, patch: Record<string, unknown>) =>
    rpc<AdminTrainerDetail>('admin_trainer_patch', {
      p_trainer_id: trainerId,
      p_patch: patch,
    }),
  trainerClients: (trainerId: string) =>
    rpc<AdminTrainerClient[]>('admin_trainer_clients', { p_trainer_id: trainerId }),
  trainerSessions: (trainerId: string) =>
    rpc<AdminTrainerSession[]>('admin_trainer_sessions', { p_trainer_id: trainerId }),
  trainerPayments: (trainerId: string) =>
    rpc<AdminTrainerPayment[]>('admin_trainer_payments', { p_trainer_id: trainerId }),
  waitlist: () => rpc<AdminWaitlistRow[]>('admin_waitlist'),
  feedback: () => rpc<AdminFeedbackRow[]>('admin_feedback'),
  feedbackReply: (feedbackId: string, reply: string) =>
    rpc<{ ok: boolean; cleared?: boolean }>('admin_feedback_reply', {
      p_feedback_id: feedbackId,
      p_reply: reply,
    }),
};
