'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { Payment } from '@/lib/types';

export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.listPendingPayments(token, { limit, skip });
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [skip]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmAction() {
    if (!action) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action.type === 'approve') {
        await api.approvePayment(token, action.id);
        setNotice('Payment approved — membership extended.');
      } else {
        await api.rejectPayment(token, action.id, rejectReason || undefined);
        setNotice('Payment rejected.');
      }
      setAction(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="display">Screenshot review</h1>
      <p className="muted">{total} pending transfer payment{total === 1 ? '' : 's'}.</p>
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && payments.length === 0 && (
        <p className="muted">Queue is empty. Members upload from Membership → Pay by transfer.</p>
      )}

      <div className="review-list">
        {payments.map((p) => (
          <article key={p.id} className="review-card">
            <div className="review-meta">
              <p>
                <strong>
                  {p.amount} {p.currency}
                </strong>{' '}
                · {p.method}
              </p>
              <p className="small muted">
                {p.user?.email || `User ${p.userId.slice(-6)}`}
                {p.user?.phone ? ` · ${p.user.phone}` : ''}
              </p>
              <p className="small muted">
                Invoice {p.invoiceId.slice(-8)} ·{' '}
                {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
              </p>
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setAction({ id: p.id, type: 'approve' })}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setAction({ id: p.id, type: 'reject' })}
                >
                  Reject
                </button>
              </div>
            </div>
            <div className="review-preview">
              {p.screenshotUrl && !p.screenshotUrl.startsWith('stub://') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.screenshotUrl} alt="Transfer screenshot" />
              ) : (
                <div className="review-placeholder">
                  {p.screenshotUrl ? 'Stub upload (dev)' : 'No image'}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {total > limit && (
        <div className="admin-pager">
          <button
            type="button"
            className="btn secondary"
            disabled={skip === 0 || loading}
            onClick={() => setSkip((s) => Math.max(0, s - limit))}
          >
            Previous
          </button>
          <span className="small muted">
            {skip + 1}–{Math.min(skip + limit, total)} of {total}
          </span>
          <button
            type="button"
            className="btn secondary"
            disabled={skip + limit >= total || loading}
            onClick={() => setSkip((s) => s + limit)}
          >
            Next
          </button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(action)}
        title={action?.type === 'approve' ? 'Approve payment' : 'Reject payment'}
        message={
          action?.type === 'approve'
            ? 'Approve this transfer and extend the membership?'
            : 'Reject this transfer screenshot? The member can upload again.'
        }
        confirmLabel={busy ? 'Working…' : action?.type === 'approve' ? 'Approve' : 'Reject'}
        onCancel={() => {
          setAction(null);
          setRejectReason('');
        }}
        onConfirm={() => void confirmAction()}
      >
        {action?.type === 'reject' && (
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="rejectReason">Reject reason (optional)</label>
            <input
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Unreadable screenshot…"
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
