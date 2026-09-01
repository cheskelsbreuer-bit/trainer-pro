import { Link } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';

const LAST_UPDATED = 'May 2026';

export function TermsPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">Terms of Service</h1>

        <Section title="Agreement">
          <p>
            These Terms of Service ("Terms") govern your access to and use of Trainer Pro
            (the "Service"), provided by Trainer Pro ("we", "us"). By creating an account
            or using the Service, you agree to these Terms. If you do not agree, do not
            use the Service.
          </p>
        </Section>

        <Section title="Accounts">
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>You must be at least 18 years old to create a trainer account.</li>
            <li>You are responsible for keeping your login credentials confidential.</li>
            <li>One account per person; do not share credentials.</li>
            <li>You are responsible for everything that happens under your account.</li>
          </ul>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>Use the Service to harass, defraud, or harm others.</li>
            <li>Send unlawful communications (spam, illegal content, deceptive offers).</li>
            <li>Attempt to reverse-engineer, scrape, or interfere with the Service.</li>
            <li>Upload malware or content you do not have rights to.</li>
            <li>Use the Service in ways that violate any law or carrier policy (including SMS regulations like A2P 10DLC and TCPA in the United States).</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these rules, with or
            without notice.
          </p>
        </Section>

        <Section title="Your content and your clients">
          <p>
            You retain ownership of all data you upload (client info, workouts, photos,
            messaging content). You grant us a limited license to host, process, and
            display that content as needed to operate the Service.
          </p>
          <p>
            <strong>Client data is your responsibility.</strong> If you collect personal,
            health, or payment information from your clients through Trainer Pro, you act
            as the data controller for that information. You are responsible for:
          </p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>Obtaining valid consent from your clients.</li>
            <li>Ensuring your liability waivers and intake forms comply with the laws of your jurisdiction.</li>
            <li>Honoring deletion, export, and access requests from your clients.</li>
            <li>Communicating with clients in compliance with applicable consumer-protection and anti-spam laws.</li>
          </ul>
        </Section>

        <Section title="Health and fitness disclaimer">
          <p>
            Trainer Pro is software, not medical advice. Information stored in the Service
            (workouts, intake answers, progress notes) is not a substitute for advice from
            a qualified medical professional. Trainers and clients are responsible for
            consulting their physicians where appropriate. We make no guarantee that any
            workout, plan, or content stored in the Service will produce a particular
            health outcome or be safe for any specific individual.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            Payments processed through Stripe Connect (when enabled) flow directly to the
            trainer's connected Stripe account. We may charge a platform fee or a
            subscription fee, disclosed in the pricing section of the Service.
          </p>
          <p>
            Subscription fees are billed monthly or annually based on the plan you select.
            You can cancel at any time; cancellation takes effect at the end of the
            current billing period. We do not offer refunds for partial periods unless
            required by law.
          </p>
          <p>
            Failed payments may result in account suspension after a 7-day grace period.
          </p>
        </Section>

        <Section title="Beta features">
          <p>
            We may release features marked "beta," "preview," or "coming soon." These are
            not part of the committed Service and may change, break, or be removed
            without notice. Use beta features at your own risk.
          </p>
        </Section>

        <Section title="Service availability">
          <p>
            We aim for high availability but do not guarantee uninterrupted service.
            Planned maintenance, outages from upstream providers (Supabase, Stripe,
            Twilio, Resend, Google), or network issues may cause disruptions. We are not
            liable for losses caused by such interruptions.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may delete your account at any time from Settings. We may terminate or
            suspend your account if you breach these Terms, fail to pay, or use the
            Service for unlawful purposes. On termination, your data is removed within
            30 days, subject to legal retention requirements.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p className="uppercase text-sm">
            The service is provided "as is" and "as available" without warranties of any
            kind, express or implied, including merchantability, fitness for a particular
            purpose, and non-infringement, to the fullest extent permitted by law.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p className="uppercase text-sm">
            To the fullest extent permitted by law, Trainer Pro and its providers shall
            not be liable for indirect, incidental, special, consequential, or punitive
            damages, including loss of profits, data, goodwill, or other intangible
            losses, arising out of or relating to your use of the service. Our total
            liability for any claim shall not exceed the amount you paid us in the
            twelve months preceding the claim, or one hundred US dollars, whichever is
            greater.
          </p>
        </Section>

        <Section title="Indemnification">
          <p>
            You agree to indemnify and hold us harmless from any claim, loss, or expense
            (including reasonable attorneys' fees) arising out of your use of the
            Service, your content, your clients, your violation of these Terms, or your
            violation of any law.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These Terms are governed by the laws of the State of New York, without
            regard to conflict-of-law principles. Disputes shall be resolved in the state
            or federal courts located in New York County, New York, and you consent to
            the jurisdiction of those courts.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these Terms. Material changes will be posted here and emailed
            to active trainer accounts at least 14 days before they take effect.
            Continued use of the Service after changes constitutes acceptance.
          </p>
        </Section>

        {/* Carrier vetting (A2P 10DLC) requires the SMS program terms to
            be publicly readable: program name, frequency, rates, HELP and
            STOP in bold, and a support contact. */}
        <Section title="SMS / text message program terms">
          <p>
            <strong>Program name:</strong> Trainer Pro account notifications.
          </p>
          <p>
            <strong>What we send:</strong> businesses using Trainer Pro (for example a babysitter,
            childcare provider or coach) send their own existing customers account notifications —
            balance reminders, payment receipts, and schedule announcements such as closures. These
            messages may contain a secure link for the customer to view their balance or pay online.
          </p>
          <p>
            <strong>How you opt in:</strong> you provide your mobile number to that business when
            you enrol or sign up with them, and agree at that time to receive billing and schedule
            messages. Numbers are never purchased, rented, or obtained from third parties, and are
            never shared with third parties or used for marketing.
          </p>
          <p>
            <strong>Message frequency:</strong> recurring; typically 1–4 messages per month,
            depending on your account activity and the business's billing schedule.
          </p>
          <p>
            <strong>Cost:</strong> Trainer Pro does not charge you for these messages.{' '}
            <strong>Message and data rates may apply</strong> from your mobile carrier.
          </p>
          <p>
            <strong>To stop:</strong> reply <strong>STOP</strong> to any message and you will
            immediately be unsubscribed and receive no further texts. You can rejoin by asking the
            business to add your number again.
          </p>
          <p>
            <strong>For help:</strong> reply <strong>HELP</strong> to any message, contact the
            business that sends you the messages directly, or email{' '}
            <a href="mailto:hello@trainerpro.coach" className="text-blue-600 hover:underline">
              hello@trainerpro.coach
            </a>
            .
          </p>
          <p>
            Carriers are not liable for delayed or undelivered messages. Message delivery is
            best-effort and depends on your carrier and device.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms:{' '}
            <a href="mailto:hello@trainerpro.coach" className="text-blue-600 hover:underline">
              hello@trainerpro.coach
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <Link to="/privacy" className="hover:text-slate-900">← Privacy Policy</Link>
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
