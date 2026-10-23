'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { AdminOverview } from '@/lib/types';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api
      .getAdminOverview(token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="display">Admin overview</h1>
      <p className="muted">Pending reviews and overdue invoices.</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="notice error">{error}</div>}
      {data && (
        <div className="admin-stat-row">
          <Link href="/admin/payments/pending" className="admin-stat">
            <span className="admin-stat-value">{data.pendingPayments}</span>
            <span className="admin-stat-label">Pending payments</span>
          </Link>
          <Link href="/admin/invoices?status=overdue" className="admin-stat">
            <span className="admin-stat-value">{data.overdueInvoices}</span>
            <span className="admin-stat-label">Overdue invoices</span>
          </Link>
        </div>
      )}
    </div>
  );
}
