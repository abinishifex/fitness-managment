import Link from 'next/link';
import { Brand } from './Brand';
export function PublicHeader() { return <header className="topbar container"><Brand /><nav className="nav"><Link href="/login">Log in</Link><Link className="btn" href="/register">Start training</Link></nav></header>; }
