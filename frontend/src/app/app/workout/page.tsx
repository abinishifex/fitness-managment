'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { PlanSummary, TodayWorkout } from '@/lib/types';
import { WorkoutPlayer } from '@/components/workout/WorkoutPlayer';
import { WORKOUT_HERO } from '@/lib/exerciseMedia';
import {
  offlineApi,
  peekPlans,
  peekSelectedPlanId,
  peekToday,
} from '@/lib/offline';

export default function Workout() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selected = peekSelectedPlanId();
    const cachedPlans = peekPlans();
    const cached = peekToday(selected || undefined);
    if (cachedPlans) {
      setPlans(cachedPlans.plans);
      setSelectedPlanId(cachedPlans.selectedPlanId);
    } else if (selected) {
      setSelectedPlanId(selected);
    }
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

    async function load() {
      try {
        const list = await offlineApi.listPlans(token!);
        if (cancelled) return;
        setPlans(list.data.plans);
        setSelectedPlanId(list.data.selectedPlanId);
        const planId =
          list.data.selectedPlanId ||
          list.data.plans.find((p) => p.enabled)?.planId ||
          undefined;
        const result = await offlineApi.getTodayWorkout(token!, planId);
        if (!cancelled) setWorkout(result.data);
      } catch (e) {
        if (!cancelled && !peekToday()) {
          setError(e instanceof Error ? e.message : 'Failed to load session');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    function onCacheUpdated() {
      const t = getToken();
      if (!t) return;
      const nextSelected = peekSelectedPlanId() || undefined;
      const nextPlans = peekPlans();
      if (nextPlans) {
        setPlans(nextPlans.plans);
        setSelectedPlanId(nextPlans.selectedPlanId);
      }
      void offlineApi.getTodayWorkout(t, nextSelected).then((r) => {
        if (!cancelled) setWorkout(r.data);
      });
    }
    window.addEventListener('forge:cache-updated', onCacheUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('forge:cache-updated', onCacheUpdated);
    };
  }, []);

  async function handlePlanChange(planId: string) {
    const token = getToken();
    if (!token || String(planId) === String(selectedPlanId)) return;
    setSwitching(true);
    setError('');
    setSelectedPlanId(planId);
    const cached = peekToday(planId);
    if (cached) setWorkout(cached);
    try {
      const result = await offlineApi.selectPlan(token, planId);
      if ('today' in result.data && result.data.today) {
        setWorkout(result.data.today);
      } else {
        const todayResult = await offlineApi.getTodayWorkout(token, planId);
        setWorkout(todayResult.data);
      }
      const list = peekPlans();
      if (list) {
        setPlans(list.plans);
        setSelectedPlanId(list.selectedPlanId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not switch plan');
    } finally {
      setSwitching(false);
    }
  }

  const enabledPlans = plans.filter((p) => p.enabled);

  const planSwitcher =
    enabledPlans.length > 0 ? (
      <label className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-label-telemetry text-[10px] uppercase tracking-wider text-steel-muted">
          Plan
        </span>
        <select
          className="bg-surface-overlay border border-surface-highlight text-steel-bright text-sm px-3 py-2"
          value={selectedPlanId || ''}
          disabled={switching}
          onChange={(e) => void handlePlanChange(e.target.value)}
          aria-label="Select training plan"
        >
          {enabledPlans.map((p) => (
            <option key={p.planId} value={p.planId}>
              {p.name || 'Untitled plan'}
              {String(p.planId) === String(selectedPlanId) ? ' · Active' : ''}
            </option>
          ))}
        </select>
      </label>
    ) : null;

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

  if (error && !workout) {
    return (
      <>
        <div className="page-head">
          <div>
            <div className="eyebrow">Active session</div>
            <h1 className="page-title">Workout</h1>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {planSwitcher}
            <Link href="/app" className="btn secondary">
              Dashboard
            </Link>
          </div>
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
      <div className="space-y-4">
        <div className="flex justify-end">{planSwitcher}</div>
        <div className="relative overflow-hidden border border-surface-highlight min-h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORKOUT_HERO} alt="Rest day" className="absolute inset-0 w-full h-full object-cover brightness-[0.55]" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-transparent" />
          <div className="relative z-10 p-8 md:p-12 max-w-xl">
            <div className="eyebrow">Recovery protocol</div>
            <h1 className="font-display-hero text-display-hero-mobile uppercase text-steel-bright leading-none mt-2">
              Rest day
            </h1>
            <p className="muted mt-4">
              No workout is scheduled for {workout.dayOfWeek}
              {workout.planName ? ` on ${workout.planName}` : ''}. Browse exercise types or check progress.
            </p>
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
      </div>
    );
  }

  if (!workout?.exercises.length) {
    return (
      <>
        <div className="flex justify-end mb-4">{planSwitcher}</div>
        <div className="notice">No exercises found for today&apos;s plan.</div>
        <Link className="btn" href="/app/onboarding">
          Regenerate plan
        </Link>
      </>
    );
  }

  return (
    <>
      {error && <div className="notice error mb-4">{error}</div>}
      <div className="page-head">
        <div>
          <div className="eyebrow">Active session // {workout.date}</div>
          <h1 className="page-title">{workout.dayOfWeek}</h1>
          <p className="muted">
            {workout.planName ? `${workout.planName} · ` : ''}
            Track every set with animated rest timers. Progress saves on this device.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {planSwitcher}
          <Link href="/app" className="btn secondary">
            Dashboard
          </Link>
        </div>
      </div>
      <WorkoutPlayer workout={workout} />
    </>
  );
}
