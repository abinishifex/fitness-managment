'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WORKOUT_HERO } from '@/lib/exerciseMedia';

type LocalStats = {
  setsLogged: number;
  sessionsTouched: number;
  lastDate?: string;
  completionPct?: number;
};

function readLocalStats(): LocalStats {
  if (typeof window === 'undefined') return { setsLogged: 0, sessionsTouched: 0 };
  try {
    const raw = localStorage.getItem('forge_session_log');
    if (!raw) return { setsLogged: 0, sessionsTouched: 0 };
    const log = JSON.parse(raw) as {
      date?: string;
      exercises?: { sets: { completed: boolean }[] }[];
    };
    const sets = log.exercises?.flatMap((e) => e.sets) || [];
    const done = sets.filter((s) => s.completed).length;
    return {
      setsLogged: done,
      sessionsTouched: 1,
      lastDate: log.date,
      completionPct: sets.length ? Math.round((done / sets.length) * 100) : 0,
    };
  } catch {
    return { setsLogged: 0, sessionsTouched: 0 };
  }
}

export default function Progress() {
  const [stats, setStats] = useState<LocalStats>({ setsLogged: 0, sessionsTouched: 0 });

  useEffect(() => {
    setStats(readLocalStats());
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <div className="eyebrow">Progress // telemetry</div>
          <h1 className="page-title">Your signal.</h1>
          <p className="muted">Local set tracking while the history API is pending.</p>
        </div>
      </div>

      <div className="relative overflow-hidden border border-surface-highlight min-h-[220px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={WORKOUT_HERO}
          alt=""
          className="absolute inset-0 w-full h-full object-cover brightness-[0.5] animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/70 to-transparent" />
        <div className="relative z-10 p-8 max-w-lg">
          <p className="text-label-telemetry text-signal-volt uppercase tracking-wider text-xs">
            Keep the streak alive
          </p>
          <h2 className="font-headline-md text-steel-bright uppercase text-3xl mt-2 leading-none">
            Every logged set compounds.
          </h2>
          <Link className="btn mt-6 inline-flex custom-glow" href="/app/workout">
            Train today
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="label">Sets logged</span>
          <strong>{stats.setsLogged || '—'}</strong>
          <span className="muted small">This device</span>
        </div>
        <div className="stat">
          <span className="label">Session</span>
          <strong>{stats.completionPct != null ? `${stats.completionPct}%` : '—'}</strong>
          <span className="muted small">{stats.lastDate || 'No session yet'}</span>
        </div>
        <div className="stat">
          <span className="label">Touched</span>
          <strong>{stats.sessionsTouched || '—'}</strong>
          <span className="muted small">Local sessions</span>
        </div>
        <div className="stat">
          <span className="label">History API</span>
          <strong>—</strong>
          <span className="muted small">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
