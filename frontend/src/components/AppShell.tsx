'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brand } from './Brand';
import { clearSession, getToken, api } from '@/lib/api';
const links = [['/app','Dashboard'],['/app/workout','Workout'],['/app/progress','Progress'],['/app/profile','Profile']];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  async function logout() { const token = getToken(); if (token) await api.logout(token).catch(() => undefined); clearSession(); router.push('/login'); }
  return <div className="app-layout"><aside className="sidebar"><Brand /><nav className="side-nav">{links.map(([href,label]) => <Link key={href} className={pathname === href ? 'active' : ''} href={href}>{label}</Link>)}<button className="side-nav-button" onClick={logout}>Sign out</button></nav></aside><main className="main">{children}</main><nav className="mobile-nav">{links.map(([href,label]) => <Link key={href} className={pathname === href ? 'active' : ''} href={href}>{label}</Link>)}</nav></div>;
}
