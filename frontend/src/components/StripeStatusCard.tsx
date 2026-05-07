import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { api, ApiError, apiBaseUrl } from '../lib/api';

interface StripeConfig {
  configured: boolean;
  webhook_configured: boolean;
  test_mode: boolean | null;
}

export function StripeStatusCard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['stripe-config'],
    queryFn: () => api<StripeConfig>('/stripe/config'),
    enabled: !!apiBaseUrl,
    retry: false,
    staleTime: 60_000,
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <CreditCard size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Stripe payments</h3>
          <p className="text-xs text-slate-500">
            Charge clients with Stripe Checkout. Payments auto-record and bump package balance.
          </p>
        </div>
      </div>

      {!apiBaseUrl ? (
        <Hint type="warn">
          <code>VITE_API_URL</code> not set in <code>frontend/.env.local</code>.
        </Hint>
      ) : isLoading ? (
        <p className="text-xs text-slate-500">Checking…</p>
      ) : error ? (
        <Hint type="warn">
          {(error as ApiError).status === 0
            ? "Backend isn't running. Start uvicorn (backend folder) to enable Stripe."
            : `Backend error (HTTP ${(error as ApiError).status}).`}
        </Hint>
      ) : (
        <div className="space-y-2 text-sm">
          <Row
            ok={!!data?.configured}
            label="API key configured"
            help="STRIPE_SECRET_KEY in backend/.env"
          />
          <Row
            ok={!!data?.webhook_configured}
            label="Webhook configured"
            help="STRIPE_WEBHOOK_SECRET — needed for payments to auto-record"
          />
          {data?.test_mode != null && (
            <div className="text-xs">
              {data.test_mode ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Test mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live mode
                </span>
              )}
            </div>
          )}

          {data?.configured && !data.webhook_configured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
              <p className="font-medium">Set up the webhook (one-time)</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>
                  Install the Stripe CLI →{' '}
                  <a
                    href="https://stripe.com/docs/stripe-cli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    docs <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  In a new terminal: <code className="bg-white px-1 rounded">stripe login</code>
                </li>
                <li>
                  Run:{' '}
                  <code className="bg-white px-1 rounded text-[11px]">
                    stripe listen --forward-to http://localhost:8000/stripe/webhook
                  </code>
                </li>
                <li>
                  Copy the <code>whsec_…</code> it prints, paste into{' '}
                  <code>backend/.env</code> as <code>STRIPE_WEBHOOK_SECRET</code>
                </li>
                <li>Restart uvicorn. Refresh this page — should turn green.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ ok, label, help }: { ok: boolean; label: string; help: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="text-sm">
        <span className={ok ? 'text-slate-900' : 'text-slate-700'}>{label}</span>
        <span className="text-xs text-slate-500 ml-2">{help}</span>
      </div>
    </div>
  );
}

function Hint({ children, type }: { children: React.ReactNode; type: 'warn' | 'info' }) {
  const cls =
    type === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-blue-50 border-blue-200 text-blue-900';
  return <div className={`text-xs border rounded-lg p-2 ${cls}`}>{children}</div>;
}
