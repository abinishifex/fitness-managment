'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import type { BillingPlan } from '@/lib/types';

export default function EnrollMemberPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listBillingPlans()
      .then((data) => {
        setPlans(data.plans.filter((p) => p.isActive));
        if (data.plans[0]) setPlanId(data.plans[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load plans'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.createAdminMember(token, { email, password, phone, planId });
      router.push(`/admin/members/${data.user.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll member');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="small muted">
        <Link href="/admin/members">← Members</Link>
      </p>
      <h1 className="display">Enroll member</h1>
      <p className="muted">Creates an account, assigns a plan, and opens the first invoice.</p>
      {error && <div className="notice error">{error}</div>}
      <form onSubmit={submit} className="admin-form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Temp password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="plan">Plan</label>
          <select id="plan" required value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price} {p.currency}/{p.interval}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" disabled={busy || !planId}>
          {busy ? 'Creating…' : 'Create member'}
        </button>
      </form>
    </div>
  );
}
