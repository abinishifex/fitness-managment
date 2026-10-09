'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getToken } from '../api';
import { flushQueue, pendingCount as readPendingCount } from './queue';
import { offlineApi } from './offlineApi';
import { useOnlineStatus } from './useOnlineStatus';

type SyncContextValue = {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  justSynced: boolean;
  refreshPending: () => void;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue>({
  online: true,
  pendingCount: 0,
  syncing: false,
  justSynced: false,
  refreshPending: () => undefined,
  syncNow: async () => undefined,
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refreshPending = useCallback(() => {
    setPendingCount(readPendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    const token = getToken();
    if (!token || !navigator.onLine) {
      refreshPending();
      return;
    }
    setSyncing(true);
    try {
      const result = await flushQueue();
      refreshPending();
      if (result.flushed > 0) {
        await offlineApi.revalidateAll(token);
        setJustSynced(true);
        window.setTimeout(() => setJustSynced(false), 2500);
        window.dispatchEvent(new CustomEvent('forge:cache-updated'));
      }
      if (result.authError) {
        window.dispatchEvent(new CustomEvent('forge:auth-error'));
      }
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [syncing, refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (online) void syncNow();
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when connectivity returns

  useEffect(() => {
    function onQueueChange() {
      refreshPending();
    }
    window.addEventListener('forge:queue-changed', onQueueChange);
    return () => window.removeEventListener('forge:queue-changed', onQueueChange);
  }, [refreshPending]);

  return (
    <SyncContext.Provider
      value={{ online, pendingCount, syncing, justSynced, refreshPending, syncNow }}
    >
      {children}
    </SyncContext.Provider>
  );
}
