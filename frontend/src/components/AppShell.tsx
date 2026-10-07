'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';
import { clearSession, getToken, api } from '@/lib/api';

const links = [
  ['/app', 'Train'],
  ['/app/workout', 'Workout'],
  ['/app/exercises', 'Types'],
  ['/app/progress', 'Progress'],
  ['/app/profile', 'Profile'],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  async function logout() {
    const token = getToken();
    if (token) await api.logout(token).catch(() => undefined);
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
        <Brand />
        <nav className="side-nav">
          {links.map(([href, label]) => (
            <Link key={href} className={isActive(href) ? 'active' : ''} href={href}>
              {label}
            </Link>
          ))}
          <button type="button" className="side-nav-button" onClick={logout}>
            Sign out
          </button>
        </nav>
      </aside>
      <main className="main">{children}</main>
      <nav className="mobile-nav">
        {links.map(([href, label]) => (
          <Link key={href} className={isActive(href) ? 'active' : ''} href={href}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
