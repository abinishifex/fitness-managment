'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BillingPlan } from '@/lib/types';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listBillingPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="display">Plans</h1>
      <p className="muted">Billing catalogue.</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="notice error">{error}</div>}
      {!loading && plans.length === 0 && <p className="muted">No plans. Run seed:plans.</p>}
      {plans.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Interval</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="small muted">{p.description}</div>
                  </td>
                  <td>
                    {p.price} {p.currency}
                  </td>
                  <td>{p.interval}</td>
                  <td>{p.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
