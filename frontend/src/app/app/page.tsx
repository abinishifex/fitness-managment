'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { ActivePlan, PlanSummary, Profile, TodayWorkout } from '@/lib/types';
import { ExerciseTypeGrid } from '@/components/workout/ExerciseTypeGrid';
import { GeneralPlanOverview } from '@/components/workout/GeneralPlanOverview';
import { PlanGrid } from '@/components/workout/PlanGrid';
import { getExerciseImage, WORKOUT_HERO } from '@/lib/exerciseMedia';
import {
  offlineApi,
  peekPlan,
  peekPlans,
  peekProfile,
  peekSelectedPlanId,
  peekToday,
} from '@/lib/offline';

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<TodayWorkout | null>(null);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);

  function hydrateFromCache() {
    const cachedProfile = peekProfile()?.profile ?? null;
    const selected = peekSelectedPlanId();
    const cachedPlans = peekPlans();
    const cachedToday = peekToday(selected || undefined);
    const cachedPlan = peekPlan(selected || undefined);
    if (cachedProfile) setProfile(cachedProfile);
    if (cachedPlans) {
      setPlans(cachedPlans.plans);
      setSelectedPlanId(cachedPlans.selectedPlanId);
    } else if (selected) {
      setSelectedPlanId(selected);
    }
    if (cachedToday) {
      setToday(cachedToday);
      setLoadingToday(false);
    }
    if (cachedPlan) {
      setPlan(cachedPlan);
      setLoadingPlan(false);
    }
    if (cachedProfile && !cachedToday) setLoadingToday(false);
  }

  useEffect(() => {
    hydrateFromCache();

    const token = getToken();
    if (!token) {
      setLoadingToday(false);
      setLoadingPlan(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [profileResult, plansResult] = await Promise.allSettled([
          offlineApi.getProfile(token!),
          offlineApi.listPlans(token!),
        ]);

        if (cancelled) return;

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value.data.profile);
        }

        let planId: string | undefined;
        if (plansResult.status === 'fulfilled') {
          setPlans(plansResult.value.data.plans);
          setSelectedPlanId(plansResult.value.data.selectedPlanId);
          planId =
            plansResult.value.data.selectedPlanId ||
            plansResult.value.data.plans.find((p) => p.enabled)?.planId ||
            undefined;
        } else {
          planId = peekSelectedPlanId() || undefined;
        }

        const [todayResult, planResult] = await Promise.allSettled([
          offlineApi.getTodayWorkout(token!, planId),
          offlineApi.getActivePlan(token!, planId),
        ]);

        if (cancelled) return;

        if (todayResult.status === 'fulfilled') {
          setToday(todayResult.value.data);
        } else if (!peekToday(planId)) {
          setError(
            todayResult.reason instanceof Error
              ? todayResult.reason.message
              : 'Failed to load today',
          );
        }

        if (planResult.status === 'fulfilled') {
          setPlan(planResult.value.data);
        } else if (!peekPlan(planId)) {
          setPlan(null);
        }
      } catch (e) {
        if (!cancelled && !peekToday()) {
          setError(e instanceof Error ? e.message : 'Failed to load today');
        }
      } finally {
        if (!cancelled) {
          setLoadingToday(false);
          setLoadingPlan(false);
        }
      }
    }

    void load();

    function onCacheUpdated() {
      const t = getToken();
      if (!t) return;
      const selected = peekSelectedPlanId() || undefined;
      const cachedPlans = peekPlans();
      if (cachedPlans) {
        setPlans(cachedPlans.plans);
        setSelectedPlanId(cachedPlans.selectedPlanId);
      }
      void offlineApi.getTodayWorkout(t, selected).then((r) => setToday(r.data));
      void offlineApi.getActivePlan(t, selected).then((r) => setPlan(r.data));
      void offlineApi.getProfile(t).then((r) => setProfile(r.data.profile));
    }
    window.addEventListener('forge:cache-updated', onCacheUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('forge:cache-updated', onCacheUpdated);
    };
  }, []);

  async function handleSelectPlan(planId: string) {
    const token = getToken();
    if (!token) return;
    setSelectingId(planId);
    setError('');
    setSelectedPlanId(planId);

    const cachedToday = peekToday(planId);
    const cachedPlan = peekPlan(planId);
    if (cachedToday) setToday(cachedToday);
    if (cachedPlan) setPlan(cachedPlan);

    try {
      const result = await offlineApi.selectPlan(token, planId);
      if ('today' in result.data && result.data.today) setToday(result.data.today);
      if ('plan' in result.data && result.data.plan) setPlan(result.data.plan);
      const list = peekPlans();
      if (list) {
        setPlans(list.plans);
        setSelectedPlanId(list.selectedPlanId);
      }
      if (!('today' in result.data) || !result.data.today) {
        const todayResult = await offlineApi.getTodayWorkout(token, planId);
        setToday(todayResult.data);
      }
      if (!('plan' in result.data) || !result.data.plan) {
        const planResult = await offlineApi.getActivePlan(token, planId);
        setPlan(planResult.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not switch plan');
    } finally {
      setSelectingId(null);
    }
  }

  const ready = today && !today.isRestDay && today.exercises.length > 0;
  const preview = today?.exercises?.[0];
  const heroImage = preview
    ? getExerciseImage(preview.exercise?.primaryMuscles || [])
    : WORKOUT_HERO;
  const loading = loadingToday && !today;

  return (
    <div className="space-y-8">
      {error && <div className="notice error">{error}</div>}

      {/* Primary: Today's Plan */}
      <section
        className="relative overflow-hidden border-2 border-signal-volt/50 min-h-[420px] md:min-h-[480px] animate-fade-up shadow-[0_0_40px_rgba(212,255,0,0.08)]"
        aria-labelledby="today-plan-heading"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt="Today's training"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.68] contrast-125 animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/75 to-surface-base/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(212,255,0,0.18),transparent_40%)] animate-glow-sweep" />

        <div className="relative z-10 h-full min-h-[420px] md:min-h-[480px] flex flex-col justify-end p-6 md:p-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-surface-overlay/85 border border-signal-volt/40 px-3 py-1.5 mb-4 w-fit backdrop-blur-md">
            <span className="material-symbols-outlined text-signal-volt text-base" aria-hidden>
              {ready ? 'fitness_center' : today?.isRestDay ? 'hotel' : 'schedule'}
            </span>
            <span className="w-2 h-2 rounded-full bg-signal-volt animate-ping" aria-hidden />
            <span className="text-label-telemetry text-signal-volt uppercase tracking-widest text-[11px] font-bold">
              {loading
                ? 'Syncing…'
                : ready
                  ? "Today's plan"
                  : today?.isRestDay
                    ? 'Recovery day'
                    : 'Protocol status'}
            </span>
          </div>

          <h1
            id="today-plan-heading"
            className="font-display-hero text-display-hero-mobile md:text-headline-xl uppercase text-steel-bright leading-none"
          >
            {ready ? 'Train now.' : today?.isRestDay ? 'Recover well.' : profile ? 'Build your plan.' : 'Set up training.'}
          </h1>
          <p className="mt-4 text-steel-muted max-w-md text-base md:text-lg leading-relaxed">
            {ready
              ? `${today!.planName ? `${today!.planName} · ` : ''}${today!.dayOfWeek} · ${today!.exercises.length} movements · ${today!.sessionDurationMinutes || profile?.sessionDurationMinutes || '—'} min`
              : today?.isRestDay
                ? 'No lifts scheduled. Browse exercise types or review your week below.'
                : profile
                  ? 'Generate a validated plan from onboarding to unlock today\'s workout.'
                  : 'Complete onboarding so FORGE can prescribe today\'s session.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="btn custom-glow text-base px-6 py-3"
              href={ready ? '/app/workout' : '/app/onboarding'}
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-lg" aria-hidden>
                  {ready ? 'play_arrow' : 'rocket_launch'}
                </span>
                {ready ? 'Start workout' : 'Initialize plan'}
              </span>
            </Link>
            <Link className="btn secondary" href="/app/exercises">
              Browse types
            </Link>
          </div>
        </div>
      </section>

      <PlanGrid
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelect={handleSelectPlan}
        selectingId={selectingId}
      />

      {/* Plan journey: streak, week progress, upcoming — secondary to Today */}
      <GeneralPlanOverview plan={plan} today={today} loading={loadingPlan && !plan} />

      {ready && (
        <section className="animate-fade-up delay-100" aria-labelledby="todays-lifts-heading">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <div className="eyebrow inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-signal-volt" aria-hidden>
                  checklist
                </span>
                Today&apos;s lifts
              </div>
              <h2
                id="todays-lifts-heading"
                className="font-headline-md text-steel-bright uppercase text-2xl md:text-3xl mt-1"
              >
                Your session queue
              </h2>
              <p className="muted small mt-1">Next movement first — tap any card to open the tracker.</p>
            </div>
            <Link
              href="/app/workout"
              className="text-label-telemetry text-signal-volt uppercase text-xs tracking-wider hover:underline inline-flex items-center gap-1"
            >
              Open tracker
              <span className="material-symbols-outlined text-sm" aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {today!.exercises.slice(0, 6).map((ex, i) => {
              const img = getExerciseImage(ex.exercise?.primaryMuscles || []);
              const isNext = i === 0;
              return (
                <Link
                  key={`${ex.exerciseId}-${i}`}
                  href="/app/workout"
                  className={`group relative overflow-hidden h-48 transition-shadow ${
                    isNext
                      ? 'border-2 border-signal-volt shadow-[0_0_24px_rgba(212,255,0,0.15)]'
                      : 'border border-surface-highlight'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={ex.exercise?.name || `Exercise ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.65] transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/30 to-transparent" />
                  {isNext && (
                    <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 bg-signal-volt text-surface-base px-2 py-1 text-[10px] font-label-telemetry uppercase tracking-wider font-bold">
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        bolt
                      </span>
                      Next up
                    </span>
                  )}
                  <div className="relative z-10 h-full flex flex-col justify-end p-4">
                    <span className="text-label-telemetry text-signal-volt text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm" aria-hidden>
                        timer
                      </span>
                      {String(i + 1).padStart(2, '0')} · {ex.sets}×{ex.reps}
                    </span>
                    <h3
                      className={`font-headline-md text-steel-bright uppercase leading-tight mt-1 ${
                        isNext ? 'text-xl md:text-2xl' : 'text-lg'
                      }`}
                    >
                      {ex.exercise?.name || `Exercise ${i + 1}`}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="animate-fade-up delay-200">
        <div className="mb-4">
          <div className="eyebrow">Exercise types</div>
          <h2 className="font-headline-md text-steel-bright uppercase text-2xl mt-1">Train by pattern</h2>
          <p className="muted small mt-1">Browse the catalogue when you want variety — your plan above stays the path.</p>
        </div>
        <ExerciseTypeGrid />
      </section>
    </div>
  );
}
