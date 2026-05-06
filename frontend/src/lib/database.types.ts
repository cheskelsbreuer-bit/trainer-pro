// TypeScript types mirroring the Supabase schema in supabase/01_schema.sql.
// Update both files together when adding fields. (You can also auto-generate
// these via `npx supabase gen types typescript` once you've linked the project.)

export type SessionStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type ClientStatus = 'active' | 'paused' | 'archived';

export type PaymentType =
  | 'session'
  | 'package'
  | 'subscription'
  | 'refund'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'venmo'
  | 'zelle'
  | 'paypal'
  | 'stripe'
  | 'check'
  | 'other';

export interface Trainer {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  primary_color: string;
  default_packages: PackageDefinition[];
  notify_email: boolean;
  notify_sms: boolean;
  sms_phone: string | null;
  // Public booking (added in supabase/04_booking.sql)
  slug: string | null;
  booking_enabled: boolean;
  booking_settings: BookingSettings;
  created_at: string;
  updated_at: string;
}

export interface BookingSettings {
  lead_hours: number;
  max_days_ahead: number;
  default_duration_min: number;
  buffer_min: number;
  intro_text?: string;
  windows: {
    weekday: number; // 0=Sun..6=Sat
    start: string; // "06:00"
    end: string; // "20:00"
  }[];
}

export interface PackageDefinition {
  name: string;
  sessions: number;
  price: number;
}

export interface Client {
  id: string;
  trainer_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  goals: string | null;
  medical_notes: string | null;
  emergency_contact: string | null;
  status: ClientStatus;
  tags: string[];
  rate_per_session: number | null;
  package_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  trainer_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: SessionStatus;
  session_type: string;
  location: string | null;
  notes: string | null;
  client_notes: string | null;
  price: number | null;
  paid: boolean;
  payment_id: string | null;
  workout_plan_id: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  trainer_id: string;
  client_id: string;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  sessions_covered: number;
  description: string | null;
  method: PaymentMethod | null;
  reference: string | null;
  paid_at: string;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  trainer_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  exercises: ExerciseBlock[];
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseBlock {
  name: string;
  sets: number;
  reps: number | string; // can be "AMRAP" or a number
  weight: number | null;
  rest_sec: number | null;
  notes: string | null;
}

export interface ProgressEntry {
  id: string;
  trainer_id: string;
  client_id: string;
  metric_type: string;
  metric_value: number | null;
  metric_unit: string | null;
  photo_url: string | null;
  notes: string | null;
  measured_at: string;
}

export interface Message {
  id: string;
  trainer_id: string;
  client_id: string;
  sender: 'trainer' | 'client';
  body: string;
  attachments: { url: string; name: string; mime: string }[];
  read_at: string | null;
  created_at: string;
}

// Generated-types-shaped wrapper so `createClient<Database>` works.
// We list only the public schema; auth.users etc. are handled by Supabase.
export interface Database {
  public: {
    Tables: {
      trainers: { Row: Trainer; Insert: Partial<Trainer>; Update: Partial<Trainer> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      sessions: { Row: Session; Insert: Partial<Session>; Update: Partial<Session> };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> };
      workout_plans: {
        Row: WorkoutPlan;
        Insert: Partial<WorkoutPlan>;
        Update: Partial<WorkoutPlan>;
      };
      progress_entries: {
        Row: ProgressEntry;
        Insert: Partial<ProgressEntry>;
        Update: Partial<ProgressEntry>;
      };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
