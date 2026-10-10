'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';
import { SyncBanner } from './SyncBanner';
import { clearSession, getToken, api } from '@/lib/api';
import { SyncProvider, clearOfflineCache, clearQueue } from '@/lib/offline';

const links = [
  ['/app', 'Train'],
  ['/app/workout', 'Workout'],
  ['/app/exercises', 'Types'],
  ['/app/progress', 'Progress'],
  ['/app/plans', 'Plans'],
  ['/app/profile', 'Profile'],
] as const;

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    function onAuthError() {
      clearOfflineCache();
      clearQueue();
      clearSession();
      router.replace('/login');
    }
    window.addEventListener('forge:auth-error', onAuthError);
    return () => window.removeEventListener('forge:auth-error', onAuthError);
  }, [router]);

  async function logout() {
    const token = getToken();
    if (token) await api.logout(token).catch(() => undefined);
    clearOfflineCache();
    clearQueue();
    clearSession();
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Brand />
        </div>
        <nav className="side-nav" aria-label="Primary">
          {links.map(([href, label]) => (
            <Link key={href} className={isActive(href) ? 'active' : ''} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="side-nav-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <SyncBanner />
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Primary mobile">
        {links.map(([href, label]) => (
          <Link key={href} className={isActive(href) ? 'active' : ''} href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SyncProvider>
      <AppShellInner>{children}</AppShellInner>
    </SyncProvider>
  );
}
