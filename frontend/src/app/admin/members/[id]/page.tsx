'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import type { AdminMember, BillingPlan, Invoice, Membership } from '@/lib/types';

export default function AdminMemberDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [member, setMember] = useState<AdminMember | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [cashOpen, setCashOpen] = useState(false);
  const [activeToggleOpen, setActiveToggleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getAdminMember(token, id);
      setMember(data.member);
      setMembership(data.membership);
      setPlan(data.plan);
      setInvoices(data.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function recordCash() {
    const token = getToken();
    if (!token || !membership) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const key = `cash-${membership.id}-${Date.now()}`;
      const result = await api.recordCash(token, {
        membershipId: membership.id,
        idempotencyKey: key,
      });
      setNotice(
        result.alreadyRecorded
          ? 'Cash already recorded (idempotent).'
          : 'Cash recorded — membership extended.'
      );
      setCashOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cash failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const token = getToken();
    if (!token || !member) return;
    const next = !member.isActive;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await api.patchAdminMember(token, id, { isActive: next });
      setMember(data.member);
      setNotice(next ? 'Member reactivated.' : 'Member deactivated — login blocked.');
      setActiveToggleOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!member) return <div className="notice error">{error || 'Member not found'}</div>;

  return (
    <div>
      <p className="small muted">
        <Link href="/admin/members">← Members</Link>
      </p>
      <h1 className="display">{member.email}</h1>
      <p className="muted">
        {member.phone || 'No phone'} · {member.isActive ? 'Active account' : 'Deactivated'}
      </p>
      <div className="actions" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={member.isActive ? 'btn secondary' : 'btn'}
          disabled={busy}
          onClick={() => setActiveToggleOpen(true)}
        >
          {member.isActive ? 'Deactivate member' : 'Reactivate member'}
        </button>
      </div>
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <section className="admin-section">
        <h2>Membership</h2>
        {membership ? (
          <>
            <p>
              Status <strong>{membership.status}</strong>
              {plan ? ` · ${plan.name}` : ''}
            </p>
            <p className="small muted">
              Ends {new Date(membership.endDate).toLocaleDateString()}
            </p>
            <button type="button" className="btn" onClick={() => setCashOpen(true)} disabled={busy}>
              Record cash payment
            </button>
          </>
        ) : (
          <p className="muted">No membership.</p>
        )}
      </section>

      <section className="admin-section">
        <h2>Invoices</h2>
        {invoices.length === 0 ? (
          <p className="muted">No invoices.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Period</th>
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
                      {new Date(inv.periodStart).toLocaleDateString()} –{' '}
                      {new Date(inv.periodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={cashOpen}
        title="Record cash"
        message="Mark the open invoice as paid with cash and extend this membership?"
        confirmLabel={busy ? 'Saving…' : 'Record cash'}
        onCancel={() => setCashOpen(false)}
        onConfirm={() => void recordCash()}
      />
      <ConfirmModal
        open={activeToggleOpen}
        title={member.isActive ? 'Deactivate member' : 'Reactivate member'}
        message={
          member.isActive
            ? 'Deactivate this account? They will not be able to log in until reactivated.'
            : 'Reactivate this account so the member can log in again?'
        }
        confirmLabel={
          busy ? 'Saving…' : member.isActive ? 'Deactivate' : 'Reactivate'
        }
        onCancel={() => setActiveToggleOpen(false)}
        onConfirm={() => void toggleActive()}
      />
    </div>
  );
}
