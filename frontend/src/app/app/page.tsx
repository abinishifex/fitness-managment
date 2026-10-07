'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { Profile, TodayWorkout } from '@/lib/types';
import { ExerciseTypeGrid } from '@/components/workout/ExerciseTypeGrid';
import { getExerciseImage, WORKOUT_HERO } from '@/lib/exerciseMedia';

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<TodayWorkout | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.getProfile(token).then((x) => setProfile(x.profile)).catch(() => null),
      api.getTodayWorkout(token).then(setToday).catch(() => null),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const ready = today && !today.isRestDay && today.exercises.length > 0;
  const preview = today?.exercises?.[0];
  const heroImage = preview
    ? getExerciseImage(preview.exercise?.primaryMuscles || [])
    : WORKOUT_HERO;

  return (
    <div className="space-y-8">
      {error && <div className="notice error">{error}</div>}

      <section className="relative overflow-hidden border border-surface-highlight min-h-[420px] md:min-h-[480px] animate-fade-up">
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
          <div className="inline-flex items-center gap-2 bg-surface-overlay/85 border border-signal-volt/40 px-3 py-1 mb-4 w-fit backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-signal-volt animate-ping" />
            <span className="text-label-telemetry text-signal-volt uppercase tracking-widest text-[11px]">
              {loading ? 'Syncing…' : ready ? 'Session ready' : today?.isRestDay ? 'Recovery day' : 'Protocol status'}
            </span>
          </div>

          <h1 className="font-display-hero text-display-hero-mobile md:text-headline-xl uppercase text-steel-bright leading-none">
            {ready ? 'Train now.' : today?.isRestDay ? 'Recover well.' : profile ? 'Build your plan.' : 'Set up training.'}
          </h1>
          <p className="mt-4 text-steel-muted max-w-md text-sm md:text-base">
            {ready
              ? `${today!.dayOfWeek} · ${today!.exercises.length} movements · ${today!.sessionDurationMinutes || profile?.sessionDurationMinutes || '—'} min`
              : today?.isRestDay
                ? 'No lifts scheduled. Browse exercise types or review your profile.'
                : profile
                  ? 'Generate a validated plan from onboarding to unlock today\'s workout.'
                  : 'Complete onboarding so FORGE can prescribe today\'s session.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="btn custom-glow"
              href={ready ? '/app/workout' : profile ? '/app/onboarding' : '/app/onboarding'}
            >
              {ready ? 'Start workout' : 'Initialize plan'}
            </Link>
            <Link className="btn secondary" href="/app/exercises">
              Browse types
            </Link>
          </div>
        </div>
      </section>

      {ready && (
        <section className="animate-fade-up delay-100">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <div className="eyebrow">Today&apos;s lifts</div>
              <h2 className="font-headline-md text-steel-bright uppercase text-2xl mt-1">Your session queue</h2>
            </div>
            <Link href="/app/workout" className="text-label-telemetry text-signal-volt uppercase text-xs tracking-wider hover:underline">
              Open tracker →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {today!.exercises.slice(0, 6).map((ex, i) => {
              const img = getExerciseImage(ex.exercise?.primaryMuscles || []);
              return (
                <Link
                  key={`${ex.exerciseId}-${i}`}
                  href="/app/workout"
                  className="group relative overflow-hidden border border-surface-highlight h-44"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={ex.exercise?.name || `Exercise ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.65] transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/30 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col justify-end p-4">
                    <span className="text-label-telemetry text-signal-volt text-[10px] uppercase tracking-wider">
                      {String(i + 1).padStart(2, '0')} · {ex.sets}×{ex.reps}
                    </span>
                    <h3 className="font-headline-md text-steel-bright uppercase text-lg leading-tight mt-1">
                      {ex.exercise?.name || `Exercise ${i + 1}`}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="animate-fade-up delay-150">
        <div className="mb-4">
          <div className="eyebrow">Exercise types</div>
          <h2 className="font-headline-md text-steel-bright uppercase text-2xl mt-1">Train by pattern</h2>
          <p className="muted small mt-1">AI visuals for each movement family — tap to explore the catalogue.</p>
        </div>
        <ExerciseTypeGrid />
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-200">
        <div className="stat">
          <span className="label">Days / week</span>
          <strong>{profile?.trainingDaysPerWeek ?? '—'}</strong>
          <span className="muted small">{profile?.trainingExperience || 'No profile'}</span>
        </div>
        <div className="stat">
          <span className="label">Today</span>
          <strong>{today?.isRestDay ? 'REST' : ready ? 'GO' : '—'}</strong>
          <span className="muted small">{today?.dayOfWeek || 'No active plan'}</span>
        </div>
        <div className="stat">
          <span className="label">Movements</span>
          <strong>{today?.exercises.length ?? '—'}</strong>
          <span className="muted small">Current session</span>
        </div>
        <div className="stat">
          <span className="label">Session</span>
          <strong>{profile?.sessionDurationMinutes ?? '—'}</strong>
          <span className="muted small">Minutes target</span>
        </div>
      </section>
    </div>
  );
}
