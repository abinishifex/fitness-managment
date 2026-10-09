'use client';

import { useEffect, useState } from 'react';

/**
 * Always start as online so SSR HTML matches the first client render.
 * Real connectivity is applied after mount (avoids hydration mismatch).
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
