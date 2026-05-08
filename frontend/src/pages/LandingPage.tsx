import {
  Dumbbell,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const APP_URL = 'https://app.trainerpro.coach';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              T
            </div>
            <span className="font-bold text-lg">Trainer Pro</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href={APP_URL} className="hover:text-slate-900">Sign in</a>
          </nav>
          <a
            href={APP_URL}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Get started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Now in beta — free for early trainers
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 max-w-3xl mx-auto leading-[1.1]">
          The dashboard for personal trainers who hate clunky software.
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Clients, workouts, payments, and progress — in one clean web app. No mobile-app
          nightmare for your clients. No per-client fees. Set up in 10 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href={APP_URL}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            Start free <ArrowRight size={16} />
          </a>
          <a
            href="#features"
            className="text-slate-700 hover:text-slate-900 px-6 py-3 rounded-lg font-medium"
          >
            See features
          </a>
        </div>
        <p className="text-xs text-slate-400 mt-4">No credit card required.</p>
      </section>

      {/* Screenshot placeholder */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-3 shadow-2xl shadow-blue-900/10">
          <div className="rounded-xl bg-white border border-slate-200 aspect-[16/10] flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Dumbbell size={48} className="mx-auto mb-3 text-blue-500" />
              <p className="text-sm">Dashboard preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Built for solo trainers and small studios who want to look professional without
            spending Sunday on admin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Feature
            icon={<Users />}
            title="Client management"
            body="Profiles, intake forms, signed waivers, and a private portal so each client knows what's next."
          />
          <Feature
            icon={<Dumbbell />}
            title="Workout builder"
            body="Templates and per-client plans. Sets, reps, weights, notes — all editable in seconds."
          />
          <Feature
            icon={<TrendingUp />}
            title="Progress tracking"
            body="Weight, body comp, PRs, and progress photos. Charts that make wins obvious."
          />
          <Feature
            icon={<Calendar />}
            title="Sessions & bookings"
            body="Public booking page, Google Calendar sync, automatic reminders. Clients self-serve."
          />
          <Feature
            icon={<CreditCard />}
            title="Payments via Stripe"
            body="Sell session packages, take card payments, see revenue trends. No extra invoicing tool."
          />
          <Feature
            icon={<CheckCircle2 />}
            title="Studio mode"
            body="Add team trainers, share clients, run multiple coaches under one brand."
          />
        </div>
      </section>

      {/* Why us */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Why trainers pick Trainer Pro over Trainerize, TrueCoach, My PT Hub.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Compare
              title="Web-only, no app"
              body="Your clients open a link and it just works on phone or laptop. No App Store. No login emails to debug."
            />
            <Compare
              title="Flat pricing"
              body="One price for all your clients. Doesn't get more expensive when you grow your roster."
            />
            <Compare
              title="10-minute setup"
              body="Sign up, add a client, build a workout, take payment. Today. Not next weekend."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Free during beta.</h2>
        <p className="text-slate-600 mb-8">
          Early trainers lock in free access while we polish things. After beta, simple flat
          pricing — no per-client fees, no contracts.
        </p>
        <a
          href={APP_URL}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Claim your free account <ArrowRight size={16} />
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              T
            </div>
            <span>Trainer Pro</span>
            <span className="text-slate-300">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={APP_URL} className="hover:text-slate-900">Sign in</a>
            <a href={`${APP_URL}`} className="hover:text-slate-900">Get started</a>
            <a href="mailto:hello@trainerpro.coach" className="hover:text-slate-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Compare({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200">
      <div className="flex items-start gap-2 mb-2">
        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
