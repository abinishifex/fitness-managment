'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import type { Invoice } from '@/lib/types';

function InvoicesInner() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [status, setStatus] = useState(initialStatus);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 30;

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.listAdminInvoices(token, {
        status: status || undefined,
        limit,
        skip,
      });
      setInvoices(data.invoices);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [status, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="display">Invoices</h1>
      <p className="muted">{total} total</p>

      <div className="admin-toolbar">
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setSkip(0);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
      </div>

      {error && <div className="notice error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && invoices.length === 0 && <p className="muted">No invoices.</p>}

      {invoices.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td>
                    {inv.amount} {inv.currency}
                  </td>
                  <td>
                    <span className={`status-pill status-${inv.status}`}>{inv.status}</span>
                  </td>
                  <td className="small muted">
                    {inv.user?.email || inv.userId.slice(-8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pager">
        <button
          type="button"
          className="btn secondary"
          disabled={skip <= 0}
          onClick={() => setSkip(Math.max(0, skip - limit))}
        >
          Prev
        </button>
        <span className="small muted">
          {total === 0 ? 0 : skip + 1}–{Math.min(skip + limit, total)} of {total}
        </span>
        <button
          type="button"
          className="btn secondary"
          disabled={skip + limit >= total}
          onClick={() => setSkip(skip + limit)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <InvoicesInner />
    </Suspense>
  );
}
