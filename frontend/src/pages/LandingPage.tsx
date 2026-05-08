import { useState } from 'react';
import {
  Dumbbell,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Star,
  Camera,
  ClipboardList,
  Activity,
  DollarSign,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const APP_URL = 'https://app.trainerpro.coach';
const SIGNUP_URL = `${APP_URL}/?mode=sign-up`;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Nav />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <FeatureGrid />
      <CompareSection />
      <EmailCapture />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ─────────────── Nav ─────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
          <a href="#how" className="hover:text-slate-900 transition">How it works</a>
          <a href="#features" className="hover:text-slate-900 transition">Features</a>
          <a href="#why" className="hover:text-slate-900 transition">Why us</a>
          <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
          <a href={APP_URL} className="hover:text-slate-900 transition">Sign in</a>
        </nav>
        <a
          href={SIGNUP_URL}
          className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm shadow-blue-600/30"
        >
          Get started free
        </a>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
        <Dumbbell size={18} strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-900">Trainer Pro</div>
        <div className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
          Run your training business
        </div>
      </div>
    </a>
  );
}

/* ─────────────── Hero ─────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* gradient blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 left-1/2 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium mb-7 shadow-sm">
          <Sparkles size={12} className="text-amber-500" />
          <span className="bg-gradient-to-r from-blue-700 to-emerald-700 bg-clip-text text-transparent font-semibold">
            Beta launch — 2 months free, then $19/mo locked in
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]">
          A free website for your training business.{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            With everything to run it.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-9 leading-relaxed">
          Get a real public profile clients can find and book through. Take card payments. Track
          workouts and progress. Manage your whole roster — for <strong>$19 a month</strong>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
          <a
            href={SIGNUP_URL}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-7 py-3.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-transform hover:-translate-y-0.5"
          >
            Start 2 months free <ArrowRight size={16} />
          </a>
          <a
            href={APP_URL}
            className="bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-7 py-3.5 rounded-xl font-medium transition"
          >
            Sign in
          </a>
        </div>
        <p className="text-xs text-slate-400">
          No credit card required · Cancel anytime · Works on every device
        </p>
      </div>

      {/* Two-up mock: client view + trainer view */}
      <div className="relative max-w-6xl mx-auto px-6 pb-16">
        <SplitMock />
      </div>
    </section>
  );
}

/* ─────────────── Split mock: public profile + dashboard ─────────────── */
function SplitMock() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-center">
      {/* What clients see — phone-shaped public profile */}
      <div className="lg:col-span-2">
        <div className="text-center lg:text-left mb-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-600">
            What your clients see
          </p>
          <p className="text-sm text-slate-600">Your free public website</p>
        </div>
        <div className="mx-auto lg:mx-0 max-w-[280px] bg-slate-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-blue-900/30">
          <div className="rounded-[2rem] bg-white overflow-hidden">
            {/* status bar */}
            <div className="h-6 bg-slate-100 flex items-center justify-center">
              <div className="w-16 h-1 bg-slate-300 rounded-full" />
            </div>
            {/* hero image */}
            <div
              className="h-32 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 relative flex items-end p-3"
            >
              <div className="text-white">
                <div className="text-[10px] opacity-80">trainerpro.coach/p/jane</div>
                <div className="font-bold text-lg leading-tight">Jane Strong</div>
                <div className="text-[11px] opacity-90">Personal trainer · Brooklyn</div>
              </div>
            </div>
            {/* body */}
            <div className="p-3 space-y-2.5">
              <p className="text-[11px] text-slate-700 leading-relaxed">
                10 years helping busy professionals build strength and feel better.
                NASM-certified.
              </p>
              <button className="w-full bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-lg shadow">
                Book a free intro session
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {['💪', '🏋️', '🥗'].map((e, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-xl"
                  >
                    {e}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="text-[10px] text-amber-500">★★★★★</div>
                <div className="text-[10px] text-slate-500">"Changed my life" — Sarah K.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What you see — laptop-style dashboard */}
      <div className="lg:col-span-3">
        <div className="text-center lg:text-left mb-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-emerald-600">
            What you see
          </p>
          <p className="text-sm text-slate-600">Your private trainer dashboard</p>
        </div>
        <DashboardMock />
      </div>
    </div>
  );
}

/* ─────────────── Dashboard mock ─────────────── */
function DashboardMock() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100 p-2 md:p-3 shadow-2xl shadow-blue-900/20">
      {/* fake browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <div className="w-3 h-3 rounded-full bg-rose-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-emerald-400" />
        <div className="ml-3 bg-white/70 rounded-md px-2 py-0.5 text-[11px] text-slate-500">
          app.trainerpro.coach/dashboard
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
        {/* fake top bar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs text-slate-400">Tuesday, May 8</div>
            <div className="text-lg font-bold">Welcome back, Jane 👋</div>
          </div>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
              ● 3 active clients
            </span>
          </div>
        </div>

        {/* stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Revenue MTD"
            value="$2,340"
            delta="+18%"
            color="emerald"
            icon={<DollarSign size={14} />}
          />
          <StatCard
            label="Sessions"
            value="24"
            delta="+4 this week"
            color="blue"
            icon={<Calendar size={14} />}
          />
          <StatCard
            label="Active clients"
            value="12"
            delta="+2 new"
            color="purple"
            icon={<Users size={14} />}
          />
          <StatCard
            label="Workouts logged"
            value="38"
            delta="92% completion"
            color="amber"
            icon={<Activity size={14} />}
          />
        </div>

        {/* split body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's sessions */}
          <div className="md:col-span-2 bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">Today's sessions</h3>
              <span className="text-xs text-slate-400">3 of 5</span>
            </div>
            <div className="space-y-2">
              <SessionRow time="9:00 AM" name="Sarah K." type="Strength" status="done" />
              <SessionRow time="11:30 AM" name="Marco P." type="HIIT" status="now" />
              <SessionRow time="2:00 PM" name="Lila R." type="Mobility" status="up" />
              <SessionRow time="4:30 PM" name="Daniel A." type="Strength" status="up" />
            </div>
          </div>

          {/* Mini chart */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Sarah's deadlift</h3>
              <span className="text-[10px] text-emerald-600 font-medium">+15 lbs</span>
            </div>
            <div className="flex-1 flex items-end gap-1 h-20">
              {[40, 45, 50, 55, 65, 72, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-indigo-500"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>4w ago</span>
              <span>now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  color,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
  icon: React.ReactNode;
}) {
  const colors = {
    emerald: 'from-emerald-50 to-teal-50 text-emerald-700 border-emerald-100',
    blue: 'from-blue-50 to-sky-50 text-blue-700 border-blue-100',
    purple: 'from-purple-50 to-fuchsia-50 text-purple-700 border-purple-100',
    amber: 'from-amber-50 to-orange-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-3`}>
      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium opacity-80">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-[11px] mt-0.5 opacity-80">{delta}</div>
    </div>
  );
}

function SessionRow({
  time,
  name,
  type,
  status,
}: {
  time: string;
  name: string;
  type: string;
  status: 'done' | 'now' | 'up';
}) {
  const badge = {
    done: { dot: 'bg-emerald-400', text: 'Done', cls: 'text-emerald-700 bg-emerald-50' },
    now: { dot: 'bg-blue-500 animate-pulse', text: 'Now', cls: 'text-blue-700 bg-blue-50' },
    up: { dot: 'bg-slate-300', text: 'Upcoming', cls: 'text-slate-600 bg-slate-100' },
  }[status];
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-slate-100">
      <div className="text-xs font-mono text-slate-500 w-16">{time}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-800">{name}</div>
        <div className="text-[11px] text-slate-500">{type}</div>
      </div>
      <span className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
        {badge.text}
      </span>
    </div>
  );
}

/* ─────────────── Social proof ─────────────── */
function SocialProof() {
  return (
    <section className="py-10 border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-xs font-semibold tracking-wider text-slate-400 uppercase mb-5">
          Built by trainers, for trainers
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <Stat n="10 min" label="Average setup time" />
          <Stat n="$19" label="Flat monthly price" />
          <Stat n="Free" label="Public website included" />
          <Stat n="∞" label="Clients per account" />
        </div>
      </div>
    </section>
  );
}
function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent">
        {n}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

/* ─────────────── How it works ─────────────── */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      icon: <Sparkles />,
      title: 'Customize your site',
      body: 'Pick your name, brand color, photo, and bio. Your public website goes live at trainerpro.coach/p/your-name.',
      color: 'from-blue-500 to-indigo-600',
      bg: 'from-blue-50 to-indigo-50',
    },
    {
      n: 2,
      icon: <Users />,
      title: 'Add your clients',
      body: 'Invite existing clients or let new ones book through your site. Each gets a private portal.',
      color: 'from-emerald-500 to-teal-600',
      bg: 'from-emerald-50 to-teal-50',
    },
    {
      n: 3,
      icon: <Dumbbell />,
      title: 'Run sessions & workouts',
      body: 'Build workouts, log sessions, track weight and PRs. Charts make every win obvious.',
      color: 'from-amber-500 to-orange-600',
      bg: 'from-amber-50 to-orange-50',
    },
    {
      n: 4,
      icon: <CreditCard />,
      title: 'Get paid',
      body: 'Take card payments through Stripe right on your website. Sell session packages or one-offs.',
      color: 'from-purple-500 to-fuchsia-600',
      bg: 'from-purple-50 to-fuchsia-50',
    },
  ];
  return (
    <section id="how" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-blue-600 mb-2">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-[1.1]">
            From zero to running your business in an afternoon.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className={`relative bg-gradient-to-br ${s.bg} rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition`}
            >
              <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-sm shadow-md border border-slate-100">
                {s.n}
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-4 shadow-md`}>
                {s.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Features grid ─────────────── */
function FeatureGrid() {
  return (
    <section id="features" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-emerald-600 mb-2">Everything included</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto leading-[1.1]">
            Every tool you need.{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Nothing you don't.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature
            icon={<Sparkles />}
            iconBg="bg-blue-100 text-blue-600"
            title="Your free trainer website"
            body="A real public page at trainerpro.coach/p/your-name. Photo, bio, testimonials, gallery, and a Book button — all in your brand color."
          />
          <Feature
            icon={<Calendar />}
            iconBg="bg-emerald-100 text-emerald-600"
            title="Self-serve bookings"
            body="Clients pick a time on your site. Google Calendar sync, automatic reminders. You stop playing scheduler."
          />
          <Feature
            icon={<CreditCard />}
            iconBg="bg-rose-100 text-rose-600"
            title="Card payments via Stripe"
            body="Sell session packages right on your website. Money lands in your bank account, not a third-party wallet."
          />
          <Feature
            icon={<Users />}
            iconBg="bg-purple-100 text-purple-600"
            title="Client management"
            body="Profiles, intake forms, signed waivers, and a private portal so each client knows what's next."
          />
          <Feature
            icon={<Dumbbell />}
            iconBg="bg-amber-100 text-amber-600"
            title="Workout builder"
            body="Templates and per-client plans. Sets, reps, weights, notes — all editable in seconds."
          />
          <Feature
            icon={<TrendingUp />}
            iconBg="bg-cyan-100 text-cyan-600"
            title="Progress tracking"
            body="Weight, body comp, PRs, and progress photos. Charts that make wins obvious."
          />
          <Feature
            icon={<Camera />}
            iconBg="bg-indigo-100 text-indigo-600"
            title="Progress photos"
            body="Side-by-side comparisons. Your clients see their transformation, you keep them motivated."
          />
          <Feature
            icon={<ClipboardList />}
            iconBg="bg-pink-100 text-pink-600"
            title="Studio mode"
            body="Add team trainers, share clients, run multiple coaches under one brand."
          />
          <Feature
            icon={<Zap />}
            iconBg="bg-yellow-100 text-yellow-600"
            title="Works on every device"
            body="Phone, tablet, laptop — no app to install. Your clients get a link and it just works."
          />
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  iconBg,
  title,
  body,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

/* ─────────────── Compare ─────────────── */
function CompareSection() {
  return (
    <section id="why" className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-purple-600 mb-2">Why us</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Why trainers pick us over{' '}
            <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
              Trainerize, TrueCoach, My PT Hub.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Compare
            title="A real public website included"
            body="Your own page at trainerpro.coach/p/your-name with photo, bio, testimonials, and a book button. No Wix, no Squarespace bill."
            color="emerald"
          />
          <Compare
            title="Flat $19/month"
            body="One price, every client included. Trainerize and TrueCoach charge per client and add up fast at $30–$80/month."
            color="blue"
          />
          <Compare
            title="10-minute setup"
            body="Sign up, answer a few questions, share your link. You'll be taking your first payment today, not next weekend."
            color="amber"
          />
        </div>
      </div>
    </section>
  );
}
function Compare({
  title,
  body,
  color,
}: {
  title: string;
  body: string;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition">
      <div className={`inline-flex w-10 h-10 rounded-xl ${colors[color]} items-center justify-center mb-4`}>
        <CheckCircle2 size={20} strokeWidth={2.5} />
      </div>
      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

/* ─────────────── Email capture ─────────────── */
function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('submitting');
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('waitlist_emails')
        .insert({ email: email.toLowerCase().trim(), source: 'landing' });
      if (error) {
        // Duplicate? Treat as success.
        if (error.code === '23505') {
          setStatus('done');
          return;
        }
        throw error;
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message || 'Something went wrong.');
    }
  }

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-6">
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl shadow-blue-900/30 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-5">
              <Star size={11} className="text-amber-300" fill="currentColor" />
              Get early access
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-[1.15]">
              Want updates without committing yet?
            </h2>
            <p className="text-blue-100 mb-7 max-w-md mx-auto">
              Drop your email. We'll only email you when something matters — new features,
              your free-beta invite, that's it.
            </p>

            {status === 'done' ? (
              <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-300/30 rounded-xl p-5 max-w-md mx-auto">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-300" />
                <p className="font-semibold">You're on the list.</p>
                <p className="text-sm text-blue-100 mt-1">
                  We'll be in touch. In the meantime, you can{' '}
                  <a href={SIGNUP_URL} className="underline font-medium">
                    start your free account now
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={status === 'submitting'}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/95 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="bg-white text-blue-700 hover:bg-amber-50 px-5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Saving…' : <>Notify me <ArrowRight size={16} /></>}
                </button>
              </form>
            )}
            {status === 'error' && errorMsg && (
              <p className="text-amber-200 text-sm mt-3">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Final CTA / pricing ─────────────── */
function FinalCTA() {
  const features = [
    'Unlimited clients',
    'Unlimited workouts & templates',
    'Stripe payments built-in',
    'Client portal + public booking page',
    'Progress tracking + photos',
    'Studio mode (multi-trainer)',
    'Google Calendar sync',
    'No per-client fees, ever',
  ];
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-sm font-semibold text-amber-600 mb-2">Pricing</p>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
          2 months free, then{' '}
          <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 bg-clip-text text-transparent">
            $19/month forever.
          </span>
        </h2>
        <p className="text-slate-600 mb-10 max-w-xl mx-auto">
          Sign up during beta and lock in <strong>50% off our launch price</strong> for life.
          No per-client fees. No contracts. Cancel anytime.
        </p>

        <div className="relative bg-white border-2 border-blue-200 rounded-3xl p-8 md:p-10 max-w-md mx-auto shadow-2xl shadow-blue-900/10 mb-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold tracking-wide shadow-md">
            BETA — LIMITED TIME
          </div>

          {/* Strikethrough launch price */}
          <div className="mb-2 mt-2">
            <span className="text-sm text-slate-400 line-through">$39/month at launch</span>
          </div>

          {/* Main price */}
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-6xl font-bold bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              $19
            </span>
            <span className="text-slate-500 text-lg">/month</span>
          </div>
          <p className="text-sm font-medium text-emerald-600 mb-1">Locked in forever</p>
          <p className="text-xs text-slate-500 mb-6">
            + your <span className="font-semibold text-slate-900">first 2 months free</span> while we polish
          </p>

          <ul className="text-left space-y-2.5 mb-7">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <a
            href={SIGNUP_URL}
            className="block w-full bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition"
          >
            Start 2 months free
          </a>
          <p className="text-[11px] text-slate-400 mt-3">No credit card required to start</p>
        </div>

        <p className="text-xs text-slate-500">
          The $19/month rate is locked for life — even years later, you keep paying $19 while
          new signups pay $39.
        </p>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */
function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href={APP_URL} className="hover:text-slate-900">Sign in</a>
            <a href={SIGNUP_URL} className="hover:text-slate-900">Sign up</a>
            <a href="mailto:hello@trainerpro.coach" className="hover:text-slate-900">Contact</a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Trainer Pro · Built for personal trainers who'd rather train than admin.
        </div>
      </div>
    </footer>
  );
}
