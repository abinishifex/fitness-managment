'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { MembershipStatus } from '@/lib/types';

function daysUntil(dateStr: string) {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function SoftGateBanner() {
  const [status, setStatus] = useState<MembershipStatus | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    api
      .getMembershipStatus(token)
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.openInvoice) return null;

  const inv = status.openInvoice;
  const delta = daysUntil(inv.dueDate);
  const amount = `${inv.amount} ${inv.currency}`;

  let message = '';
  let tone: 'warn' | 'danger' = 'warn';

  if (inv.status === 'overdue' || delta < 0) {
    tone = 'danger';
    message = `Membership payment overdue (${amount}). Pay cash at the desk or upload a transfer screenshot.`;
  } else if (delta <= 3) {
    message =
      delta === 0
        ? `Invoice of ${amount} is due today.`
        : `Invoice of ${amount} is due in ${delta} day${delta === 1 ? '' : 's'}.`;
  } else if (status.status === 'expired') {
    tone = 'danger';
    message = `Your membership has expired. Settle ${amount} to renew.`;
  } else {
    return null;
  }

  return (
    <div className={`soft-gate-banner ${tone}`} role="status">
      <p>{message}</p>
      <Link href="/app/membership" className="soft-gate-link">
        View membership
      </Link>
    </div>
  );
}
