'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { TodayWorkout } from '@/lib/types';
import { WorkoutPlayer } from '@/components/workout/WorkoutPlayer';
import { WORKOUT_HERO } from '@/lib/exerciseMedia';
import { offlineApi, peekToday } from '@/lib/offline';

export default function Workout() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = peekToday();
    if (cached) {
      setWorkout(cached);
      setLoading(false);
    }

    const token = getToken();
    if (!token) {
      setLoading(false);
      if (!cached) setError('Sign in to load your session.');
      return;
    }

    let cancelled = false;

    offlineApi
      .getTodayWorkout(token)
      .then((result) => {
        if (!cancelled) setWorkout(result.data);
      })
      .catch((e) => {
        if (!cancelled && !peekToday()) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    function onCacheUpdated() {
      const t = getToken();
      if (!t) return;
      void offlineApi.getTodayWorkout(t).then((r) => {
        if (!cancelled) setWorkout(r.data);
      });
    }
    window.addEventListener('forge:cache-updated', onCacheUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('forge:cache-updated', onCacheUpdated);
    };
  }, []);

  if (loading) {
    return (
      <div className="relative overflow-hidden border border-surface-highlight min-h-[360px] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORKOUT_HERO} alt="" className="absolute inset-0 w-full h-full object-cover brightness-50 animate-ken-burns" />
        <div className="relative z-10 text-center">
          <span className="inline-block w-3 h-3 bg-signal-volt animate-ping mb-4" />
          <p className="font-headline-md uppercase text-steel-bright text-2xl">Loading session…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="page-head">
          <div>
            <div className="eyebrow">Active session</div>
            <h1 className="page-title">Workout</h1>
          </div>
          <Link href="/app" className="btn secondary">
            Dashboard
          </Link>
        </div>
        <div className="notice error">{error}. Generate a plan from onboarding first.</div>
        <Link className="btn" href="/app/onboarding">
          Initialize plan
        </Link>
      </>
    );
  }

  if (workout?.isRestDay) {
    return (
      <div className="relative overflow-hidden border border-surface-highlight min-h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORKOUT_HERO} alt="Rest day" className="absolute inset-0 w-full h-full object-cover brightness-[0.55]" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-transparent" />
        <div className="relative z-10 p-8 md:p-12 max-w-xl">
          <div className="eyebrow">Recovery protocol</div>
          <h1 className="font-display-hero text-display-hero-mobile uppercase text-steel-bright leading-none mt-2">
            Rest day
          </h1>
          <p className="muted mt-4">No workout is scheduled for {workout.dayOfWeek}. Browse exercise types or check progress.</p>
          <div className="actions">
            <Link className="btn" href="/app/exercises">
              Browse exercises
            </Link>
            <Link className="btn secondary" href="/app">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!workout?.exercises.length) {
    return (
      <>
        <div className="notice">No exercises found for today&apos;s plan.</div>
        <Link className="btn" href="/app/onboarding">
          Regenerate plan
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Active session // {workout.date}</div>
          <h1 className="page-title">{workout.dayOfWeek}</h1>
          <p className="muted">
            Track every set with animated rest timers. Progress saves on this device.
          </p>
        </div>
        <Link href="/app" className="btn secondary">
          Dashboard
        </Link>
      </div>
      <WorkoutPlayer workout={workout} />
    </>
  );
}
