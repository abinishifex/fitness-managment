'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { AdminMember } from '@/lib/types';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.listAdminMembers(token, { q: q || undefined, limit, skip });
      setMembers(data.members);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [q, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="display">Members</h1>
          <p className="muted">{total} total</p>
        </div>
        <Link href="/admin/members/new" className="btn">
          Enroll member
        </Link>
      </div>

      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSkip(0);
          void load();
        }}
      >
        <input
          type="search"
          placeholder="Search email or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search members"
        />
        <button type="submit" className="btn secondary">
          Search
        </button>
      </form>

      {error && <div className="notice error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && members.length === 0 && (
        <p className="muted">No members found.</p>
      )}

      {members.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Phone</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.email}</td>
                  <td>{m.phone || '—'}</td>
                  <td>{m.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    <Link href={`/admin/members/${m.id}`}>Open</Link>
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
          {skip + 1}–{Math.min(skip + limit, total)} of {total}
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
