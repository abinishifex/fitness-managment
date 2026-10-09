'use client';

import { useEffect, useState } from 'react';
import { useSyncStatus } from '@/lib/offline';

export function SyncBanner() {
  const { online, pendingCount, syncing, justSynced } = useSyncStatus();
  // Defer any banner until after mount so SSR and hydration both render null
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;

  if (justSynced) {
    return (
      <div className="sync-banner sync-banner--ok" role="status">
        Synced
      </div>
    );
  }

  if (!online) {
    return (
      <div className="sync-banner" role="status">
        Offline — using saved data
        {pendingCount > 0 ? ` · ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting` : ''}
      </div>
    );
  }

  if (pendingCount > 0 || syncing) {
    return (
      <div className="sync-banner" role="status">
        {syncing
          ? 'Syncing…'
          : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`}
      </div>
    );
  }

  return null;
}
