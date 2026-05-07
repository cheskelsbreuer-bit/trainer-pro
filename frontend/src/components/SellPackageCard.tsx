import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, Copy, Check, ExternalLink, Plus, AlertCircle } from 'lucide-react';
import { api, ApiError, apiBaseUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/format';
import type { PackageDefinition } from '../lib/database.types';

interface Props {
  clientId: string;
  clientFullName: string;
  trainerDefaultPackages: PackageDefinition[] | null;
  trainerCurrency: string;
}

interface CheckoutResponse {
  url: string;
  session_id: string;
}

export function SellPackageCard({
  clientId,
  clientFullName,
  trainerDefaultPackages,
  trainerCurrency,
}: Props) {
  const [openLink, setOpenLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [custom, setCustom] = useState({ name: '', sessions: 1, amount: '' });
  const [showCustom, setShowCustom] = useState(false);

  // Pull Stripe wiring status from backend
  const { data: stripeStatus, error: stripeStatusError } = useQuery({
    queryKey: ['stripe-config'],
    queryFn: () =>
      api<{ configured: boolean; webhook_configured: boolean; test_mode: boolean | null }>(
        '/stripe/config',
      ),
    enabled: !!apiBaseUrl,
    retry: false,
    staleTime: 60_000,
  });

  const sell = useMutation({
    mutationFn: async (pkg: { name: string; sessions: number; amount: number }) => {
      // Always grab the freshest auth session before calling backend
      await supabase.auth.getSession();
      return api<CheckoutResponse>('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          package_name: pkg.name,
          amount: pkg.amount,
          sessions_covered: pkg.sessions,
          currency: trainerCurrency || 'USD',
        }),
      });
    },
    onSuccess: (resp) => {
      setOpenLink(resp.url);
    },
  });

  if (!apiBaseUrl) {
    return (
      <Card>
        <Header />
        <Hint type="warn">
          Backend URL not configured (<code>VITE_API_URL</code>). Add it to{' '}
          <code>frontend/.env.local</code> and restart Vite.
        </Hint>
      </Card>
    );
  }

  if (stripeStatusError) {
    const e = stripeStatusError as ApiError;
    return (
      <Card>
        <Header />
        <Hint type="warn">
          {e.status === 0
            ? 'Backend isn\'t reachable. Start uvicorn (see Settings → docs).'
            : `Stripe check failed (HTTP ${e.status}).`}
        </Hint>
      </Card>
    );
  }

  if (stripeStatus && !stripeStatus.configured) {
    return (
      <Card>
        <Header />
        <Hint type="warn">
          Stripe isn't configured. Add <code>STRIPE_SECRET_KEY</code> to{' '}
          <code>backend/.env</code> and restart uvicorn.
        </Hint>
      </Card>
    );
  }

  const packages: PackageDefinition[] = (trainerDefaultPackages?.length
    ? trainerDefaultPackages
    : [
        { name: '4-session pack', sessions: 4, price: 320 },
        { name: '10-session pack', sessions: 10, price: 750 },
      ]) as PackageDefinition[];

  return (
    <Card>
      <Header />
      <p className="text-xs text-slate-500 -mt-2">
        Charge {clientFullName.split(' ')[0]} via Stripe Checkout. Payment auto-records and bumps
        their package balance.
      </p>

      {stripeStatus?.test_mode && (
        <div className="mt-2 mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Test mode
        </div>
      )}

      {!stripeStatus?.webhook_configured && (
        <div className="mt-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Webhook not configured yet — Checkout works but the payment row won't auto-insert until
            you set <code>STRIPE_WEBHOOK_SECRET</code>. See instructions in chat.
          </span>
        </div>
      )}

      {!openLink && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {packages.map((p) => (
            <button
              key={p.name}
              onClick={() =>
                sell.mutate({ name: p.name, sessions: p.sessions, amount: p.price })
              }
              disabled={sell.isPending}
              className="flex flex-col items-start text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl p-3 transition disabled:opacity-50"
            >
              <span className="text-xs text-slate-500">{p.sessions} sessions</span>
              <span className="font-semibold text-slate-900">{p.name}</span>
              <span className="text-sm text-blue-700 font-medium">
                {formatMoney(p.price, trainerCurrency)}
              </span>
            </button>
          ))}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="flex items-center justify-center gap-1.5 border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 rounded-xl p-3 text-sm"
            >
              <Plus size={14} /> Custom
            </button>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 sm:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="px-2 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name"
                  value={custom.name}
                  onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  className="px-2 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sessions"
                  value={custom.sessions}
                  onChange={(e) =>
                    setCustom({ ...custom, sessions: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
                <input
                  type="number"
                  step="0.01"
                  className="px-2 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Amount"
                  value={custom.amount}
                  onChange={(e) => setCustom({ ...custom, amount: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCustom(false)}
                  className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!custom.name || !custom.amount) return;
                    sell.mutate({
                      name: custom.name,
                      sessions: custom.sessions,
                      amount: Number(custom.amount),
                    });
                  }}
                  disabled={!custom.name || !custom.amount || sell.isPending}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
                >
                  Generate link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {sell.error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-800">
          {(sell.error as ApiError).message}
        </div>
      )}

      {openLink && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium text-emerald-900">Payment link ready</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 truncate">
              {openLink}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(openLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={openLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={12} /> Open
            </a>
          </div>
          <button
            onClick={() => setOpenLink(null)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Done — sell another
          </button>
        </div>
      )}
    </Card>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <CreditCard size={18} className="text-blue-600" />
      <h3 className="font-semibold text-slate-900">Sell a package</h3>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-white border border-slate-200 rounded-xl p-5">{children}</section>;
}

function Hint({ children, type }: { children: React.ReactNode; type: 'warn' | 'info' }) {
  const cls =
    type === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-blue-50 border-blue-200 text-blue-900';
  return <div className={`text-xs border rounded-lg p-2 ${cls}`}>{children}</div>;
}
