'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { api, saveSession } from '@/lib/api';
import type { BillingPlan } from '@/lib/types';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listBillingPlans()
      .then((data) => {
        if (cancelled) return;
        setPlans(data.plans);
        if (data.plans[0]) setPlanId(data.plans[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load plans');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      saveSession(await api.register({ email, password, phone, planId }));
      router.push('/app/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-shell">
      <div className="form-card">
        <Brand />
        <h1 className="display">Create profile</h1>
        <p className="muted">Choose a plan and start with the data your protocol needs.</p>
        {error && <div className="notice error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              type="tel"
              required
              placeholder="+2519…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password / 8 characters minimum</label>
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Membership plan</label>
            <select required value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!plans.length}>
              {!plans.length && <option value="">Loading plans…</option>}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} {p.currency}/{p.interval}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" disabled={busy || !planId}>
            {busy ? 'Creating…' : 'Continue to setup'}
          </button>
        </form>
        <p className="small muted">
          Already a member?{' '}
          <Link href="/login" style={{ color: 'var(--volt)' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
