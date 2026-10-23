'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { Invoice, Membership, MembershipStatus } from '@/lib/types';

export default function MembershipPage() {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [st, mine] = await Promise.all([
        api.getMembershipStatus(token),
        api.getMyMemberships(token),
      ]);
      setStatus(st);
      setMemberships(mine.memberships);
      const primary = st.membership || mine.memberships[0];
      if (primary) {
        const inv = await api.getMembershipInvoices(token, primary.id);
        setInvoices(inv.invoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    const invoiceId = status?.openInvoice?.id;
    if (!token || !invoiceId || !file) {
      setError('Choose a screenshot for your open invoice.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.submitTransfer(token, {
        invoiceId,
        file,
        idempotencyKey: `xfer-${invoiceId}-${file.name}-${file.size}`,
      });
      setNotice(
        result.alreadyRecorded
          ? 'This upload was already submitted.'
          : 'Screenshot submitted — waiting for admin review.'
      );
      setFile(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      if (/5MB|JPEG|PNG|WebP|GIF|image/i.test(msg)) {
        setError(msg);
      } else {
        setError(msg || 'Could not upload. Use a clear JPEG/PNG under 5MB.');
      }
    } finally {
      setBusy(false);
    }
  }

  const m = status?.membership || memberships[0];

  return (
    <div>
      <h1 className="display">My membership</h1>
      <p className="muted">Status, invoices, and bank-transfer payment.</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {!loading && !m && <p className="muted">No membership yet. Contact the gym desk.</p>}

      {m && (
        <section className="admin-section">
          <h2>Current plan</h2>
          <p>
            Status{' '}
            <span className={`status-pill status-${status?.status || m.status}`}>
              {status?.status || m.status}
            </span>
          </p>
          {m.plan && (
            <p>
              {m.plan.name} — {m.plan.price} {m.plan.currency}/{m.plan.interval}
            </p>
          )}
          <p className="small muted">Ends {new Date(m.endDate).toLocaleDateString()}</p>
        </section>
      )}

      {status?.openInvoice && (
        <section className="admin-section">
          <h2>Pay by transfer</h2>
          <p>
            Open invoice: <strong>{status.openInvoice.amount} {status.openInvoice.currency}</strong>{' '}
            · due {new Date(status.openInvoice.dueDate).toLocaleDateString()} ·{' '}
            <span className={`status-pill status-${status.openInvoice.status}`}>
              {status.openInvoice.status}
            </span>
          </p>
          <form onSubmit={upload} className="admin-form">
            <div className="field">
              <label htmlFor="screenshot">Payment screenshot</label>
              <input
                id="screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="small muted">JPEG, PNG, WebP or GIF · max 5MB</p>
            </div>
            <button className="btn" disabled={busy || !file}>
              {busy ? 'Uploading…' : 'Submit for review'}
            </button>
          </form>
        </section>
      )}

      <section className="admin-section">
        <h2>Invoice history</h2>
        {invoices.length === 0 ? (
          <p className="muted">No invoices yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
