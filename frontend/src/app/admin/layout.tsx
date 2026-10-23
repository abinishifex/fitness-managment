'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { clearSession, getToken, getUser, api } from '@/lib/api';

const links = [
  ['/admin', 'Overview'],
  ['/admin/members', 'Members'],
  ['/admin/plans', 'Plans'],
  ['/admin/invoices', 'Invoices'],
  ['/admin/payments/pending', 'Review queue'],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.replace('/app');
    }
  }, [router]);

  async function logout() {
    const token = getToken();
    if (token) await api.logout(token).catch(() => undefined);
    clearSession();
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Brand />
          <p className="small muted" style={{ marginTop: 8 }}>
            Admin
          </p>
        </div>
        <nav className="side-nav" aria-label="Admin">
          {links.map(([href, label]) => (
            <Link key={href} className={isActive(href) ? 'active' : ''} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link href="/app" className="side-nav-button" style={{ display: 'block', marginBottom: 8 }}>
            Member app
          </Link>
          <button type="button" className="side-nav-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
