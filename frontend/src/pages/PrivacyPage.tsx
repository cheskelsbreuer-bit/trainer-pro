import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';

const LAST_UPDATED = 'May 2026';

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Dumbbell size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold">Trainer Pro</span>
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <p className="text-sm text-slate-500 mb-1">Last updated: {LAST_UPDATED}</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">Privacy Policy</h1>

        <Section title="Overview">
          <p>
            Trainer Pro ("we", "us", "our") provides software for personal trainers and
            small studios to manage clients, sessions, payments, and progress. This policy
            explains what information we collect, why, and how we handle it. By using
            Trainer Pro, you agree to this Privacy Policy.
          </p>
        </Section>

        <Section title="Who this policy covers">
          <p>
            <strong>Trainers</strong> — people who sign up for a Trainer Pro account to run
            their training business.
          </p>
          <p>
            <strong>Clients</strong> — people who interact with the platform through a
            trainer's invitation, intake form, or public booking page.
          </p>
          <p>
            <strong>Visitors</strong> — anyone who visits our marketing site without
            signing up.
          </p>
        </Section>

        <Section title="What we collect">
          <Sub title="From trainers">
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>Account info: name, business name, email, phone, time zone, currency</li>
              <li>Profile content you create: logo, bio, photos, testimonials, brand color</li>
              <li>Business activity: clients you add, workouts, sessions, payments</li>
              <li>Settings and preferences (email/SMS opt-ins, notification rules)</li>
              <li>Optional integrations you enable (Google Calendar tokens, Stripe Connect IDs)</li>
            </ul>
          </Sub>
          <Sub title="From clients (entered by their trainer or by themselves)">
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>Identity: name, email, phone, date of birth, emergency contact</li>
              <li>Health & training: goals, medical notes, PAR-Q answers, signed waivers</li>
              <li>Progress data: weight, body composition, PRs, progress photos</li>
              <li>Session and payment history</li>
            </ul>
          </Sub>
          <Sub title="Automatically collected">
            <ul className="list-disc list-outside ml-5 space-y-1.5">
              <li>Authentication tokens, IP address, browser/user-agent</li>
              <li>Crash logs and feedback you submit through the in-app form</li>
              <li>Standard server access logs (retained no more than 90 days)</li>
            </ul>
          </Sub>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>Run the service: authenticate sign-ins, store your data, deliver features.</li>
            <li>Communicate: account emails, session reminders, billing, important updates.</li>
            <li>Improve the product: aggregate usage analytics, fix bugs, plan features.</li>
            <li>Protect users: detect fraud, enforce our Terms, comply with the law.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your data, and we do not use clients' health or
            payment information for advertising.
          </p>
        </Section>

        <Section title="Service providers we share data with">
          <p>
            We use trusted third-party processors to run Trainer Pro. They access only the
            data needed to perform their function and are bound by their own privacy
            commitments.
          </p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li><strong>Supabase</strong> — database hosting and authentication.</li>
            <li><strong>Vercel</strong> — frontend hosting and content delivery.</li>
            <li><strong>Render</strong> — backend hosting.</li>
            <li><strong>Stripe</strong> — payment processing. Card data is sent directly to Stripe and never touches our servers.</li>
            <li><strong>Twilio</strong> — SMS reminders. We send only the phone number and message body.</li>
            <li><strong>Resend</strong> — transactional email (reminders, intake forms, account notices).</li>
            <li><strong>Google</strong> — optional Calendar sync, only if a trainer enables it.</li>
          </ul>
        </Section>

        <Section title="Where data lives">
          <p>
            Trainer Pro hosts data in the United States (AWS US-East-1 via our service
            providers). If you access Trainer Pro from outside the United States, you
            understand and consent to your data being transferred to and processed in the
            United States.
          </p>
        </Section>

        <Section title="How long we keep data">
          <p>
            We keep your account data for as long as your account is active. If you delete
            your account, we remove personal data within 30 days, except where we are
            required to retain it (e.g., financial records for tax purposes — kept up to
            seven years). Backups containing deleted data are overwritten on a rolling
            basis within 90 days.
          </p>
        </Section>

        <Section title="Your rights">
          <p>You can:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>Access, correct, or export your data at any time from inside the app.</li>
            <li>Delete your account and the personal data we hold about you.</li>
            <li>Opt out of non-essential email/SMS communications.</li>
            <li>Ask us a question or file a complaint at <a href="mailto:privacy@trainerpro.coach" className="text-blue-600 hover:underline">privacy@trainerpro.coach</a>.</li>
          </ul>
          <p>
            If you are a client of a trainer using Trainer Pro and want your data removed,
            contact your trainer directly — they control their client roster. We will
            assist them in fulfilling your request.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard security practices: TLS in transit, encryption at
            rest, role-based access controls, audited dependencies, and least-privilege
            tokens. No system is perfectly secure; if a breach affects you, we will notify
            you promptly as required by law.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Trainer Pro is not intended for children under 16. If a trainer adds a minor
            client, the trainer is responsible for obtaining parental/guardian consent in
            their jurisdiction and for documenting it in the client's file.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy. If changes are material, we'll notify trainers by
            email at least 14 days before they take effect.
          </p>
        </Section>

        <Section title="Text messages and phone numbers">
          <p>
            Phone numbers collected by a business using Trainer Pro are used only to send that
            business's own customers account notifications — balance reminders, payment receipts and
            schedule announcements. Mobile information is never shared with, sold, or rented to third
            parties or affiliates for marketing or promotional purposes. Numbers are passed only to
            the messaging carrier strictly to deliver the message you asked for.
          </p>
          <p>
            Reply STOP to any message to stop receiving them, or HELP for help.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, requests, or complaints:{' '}
            <a href="mailto:privacy@trainerpro.coach" className="text-blue-600 hover:underline">
              privacy@trainerpro.coach
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <Link to="/terms" className="hover:text-slate-900">Terms of Service →</Link>
          <Link to="/" className="hover:text-slate-900">Back to home</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3 text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="font-semibold text-slate-800 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}
