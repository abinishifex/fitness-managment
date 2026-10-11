'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TodayWorkout } from '@/lib/types';
import { getExerciseMedia, resolveExerciseType } from '@/lib/exerciseMedia';
import {
  createSessionLog,
  loadSessionLog,
  saveSessionLog,
  sessionProgress,
  type SessionLog,
} from '@/lib/sessionLog';
import { ExerciseDemo } from './ExerciseDemo';
import { ProgressRing } from './ProgressRing';
import { RestTimer } from './RestTimer';
import { SetTracker } from './SetTracker';

type Props = { workout: TodayWorkout };

function resolveDayFocus(workout: TodayWorkout): string {
  const counts = new Map<string, number>();
  for (const ex of workout.exercises) {
    const label = resolveExerciseType(ex.exercise?.primaryMuscles || []).label;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  let best = 'Training';
  let bestN = 0;
  for (const [label, n] of counts) {
    if (n > bestN) {
      best = label;
      bestN = n;
    }
  }
  return `${best} day`;
}

export function WorkoutPlayer({ workout }: Props) {
  const [log, setLog] = useState<SessionLog | null>(null);
  const [activeExercise, setActiveExercise] = useState(0);
  const [resting, setResting] = useState(false);

  useEffect(() => {
    const existing = loadSessionLog(String(workout.planId), workout.date);
    if (existing) {
      setLog(existing);
      const firstOpen = existing.exercises.findIndex((ex) => ex.sets.some((s) => !s.completed));
      setActiveExercise(firstOpen === -1 ? existing.exercises.length - 1 : firstOpen);
      return;
    }
    const fresh = createSessionLog(
      String(workout.planId),
      workout.date,
      workout.exercises.map((ex) => ({
        exerciseId: String(ex.exerciseId),
        sets: ex.sets,
      }))
    );
    setLog(fresh);
    saveSessionLog(fresh);
  }, [workout]);

  const persist = useCallback((next: SessionLog) => {
    setLog(next);
    saveSessionLog(next);
  }, []);

  const progress = useMemo(() => (log ? sessionProgress(log) : { total: 0, done: 0, pct: 0 }), [log]);
  const dayFocus = useMemo(() => resolveDayFocus(workout), [workout]);

  const current = workout.exercises[activeExercise];
  const currentLog = log?.exercises[activeExercise];
  const activeSetIndex = currentLog?.sets.findIndex((s) => !s.completed) ?? 0;
  const completedSets = currentLog?.sets.filter((s) => s.completed).length ?? 0;
  const totalSets = currentLog?.sets.length ?? current?.sets ?? 0;
  const exerciseDone = totalSets > 0 && completedSets >= totalSets;
  const media = getExerciseMedia(current?.exercise?.primaryMuscles || [], current?.exercise);
  const restSeconds = current?.restSeconds || 90;
  const hasNextExercise = activeExercise < workout.exercises.length - 1;

  function completeSet(index: number) {
    if (!log || !currentLog) return;
    const set = currentLog.sets[index];
    if (!set || set.completed) return;

    const next = structuredClone(log);
    const targetReps = current.reps.split('-')[0]?.trim() || current.reps;
    next.exercises[activeExercise].sets[index] = {
      ...next.exercises[activeExercise].sets[index],
      reps: next.exercises[activeExercise].sets[index].reps || targetReps,
      completed: true,
      completedAt: new Date().toISOString(),
    };

    const allDone = next.exercises[activeExercise].sets.every((s) => s.completed);
    if (next.exercises.every((ex) => ex.sets.every((s) => s.completed))) {
      next.completedAt = new Date().toISOString();
    }
    persist(next);

    if (!allDone) {
      setResting(true);
      return;
    }
    if (hasNextExercise) setResting(true);
  }

  function repeatExercise() {
    if (!log) return;
    const next = structuredClone(log);
    next.exercises[activeExercise].sets = next.exercises[activeExercise].sets.map(() => ({
      weightKg: '',
      reps: '',
      completed: false,
    }));
    next.completedAt = undefined;
    persist(next);
    setResting(false);
  }

  function goNextExercise() {
    if (!hasNextExercise) return;
    setResting(false);
    setActiveExercise((i) => i + 1);
  }

  function finishRest() {
    setResting(false);
    if (!log) return;
    const currentDone = log.exercises[activeExercise].sets.every((s) => s.completed);
    if (currentDone && hasNextExercise) {
      setActiveExercise((i) => i + 1);
    }
  }

  if (!log || !current || !currentLog) return null;

  const name = current.exercise?.name || `Exercise ${activeExercise + 1}`;
  const muscles = current.exercise?.primaryMuscles?.join(' · ') || 'compound';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border border-surface-highlight bg-surface-raised/60 px-5 py-4">
        <div>
          <p className="text-label-telemetry text-signal-volt uppercase tracking-widest text-[10px]">
            Active session · {workout.dayOfWeek}
          </p>
          <h2 className="font-headline-xl text-steel-bright uppercase text-3xl md:text-4xl leading-none mt-1">
            {dayFocus}
          </h2>
          <p className="muted mt-2 text-sm">
            {workout.planName ? `${workout.planName} · ` : ''}
            Tap complete after each set — no forms mid-lift.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing
            value={progress.pct}
            size={72}
            stroke={6}
            sublabel="session"
            pulse={progress.pct > 0 && progress.pct < 100}
          />
          <div>
            <p className="font-headline-md text-steel-bright text-xl tabular-nums">
              {progress.done}/{progress.total}
            </p>
            <p className="text-label-telemetry text-steel-muted uppercase text-[10px] tracking-wider">
              Sets done
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_220px] gap-4 items-stretch">
        <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)] gap-4 min-h-0">
          <ExerciseDemo
            media={media}
            name={name}
            targetReps={current.reps}
            restSeconds={restSeconds}
            muscles={muscles}
            exerciseType={current.exercise?.type}
            completedSets={completedSets}
            totalSets={totalSets}
          />

          <SetTracker
            sets={currentLog.sets}
            targetReps={current.reps}
            activeIndex={activeSetIndex < 0 ? currentLog.sets.length - 1 : activeSetIndex}
            exerciseDone={exerciseDone}
            onComplete={completeSet}
            onRepeat={repeatExercise}
            onNextExercise={goNextExercise}
            hasNextExercise={hasNextExercise}
          />
        </div>

        <aside className="border border-surface-highlight bg-surface-raised/50 overflow-hidden flex flex-col max-h-[70vh] lg:max-h-none">
          <div className="px-3 py-3 border-b border-surface-highlight shrink-0">
            <p className="text-label-telemetry text-signal-volt uppercase tracking-widest text-[10px]">
              Today&apos;s lifts
            </p>
            <p className="text-xs text-steel-muted mt-1">
              {workout.exercises.length} exercises · tap to switch
            </p>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {workout.exercises.map((ex, i) => {
              const done = log.exercises[i]?.sets.every((s) => s.completed);
              const setsDone = log.exercises[i]?.sets.filter((s) => s.completed).length ?? 0;
              const setsTotal = log.exercises[i]?.sets.length ?? ex.sets;
              const chipMedia = getExerciseMedia(ex.exercise?.primaryMuscles || [], ex.exercise);
              const active = i === activeExercise;
              return (
                <button
                  key={`${ex.exerciseId}-${i}`}
                  type="button"
                  onClick={() => {
                    setActiveExercise(i);
                    setResting(false);
                  }}
                  className={`w-full text-left border overflow-hidden transition-colors ${
                    active
                      ? 'border-signal-volt bg-signal-volt/10'
                      : done
                        ? 'border-signal-volt/35 hover:border-signal-volt/60'
                        : 'border-surface-highlight hover:border-steel-muted'
                  }`}
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-surface-base">
                    {chipMedia.video && active ? (
                      <video
                        className="absolute inset-0 w-full h-full object-cover brightness-100"
                        src={chipMedia.video}
                        poster={chipMedia.poster || chipMedia.image}
                        muted
                        loop
                        playsInline
                        autoPlay
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={chipMedia.poster || chipMedia.image}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover ${
                          active ? 'brightness-100' : 'brightness-75'
                        }`}
                      />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-surface-base/90 via-transparent to-transparent" />
                    {chipMedia.video && !active && (
                      <span className="absolute inset-0 flex items-center justify-center bg-surface-base/25">
                        <span className="material-symbols-outlined text-steel-bright text-2xl">
                          play_arrow
                        </span>
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-label-telemetry uppercase tracking-wider bg-surface-overlay/85 border border-surface-highlight px-1.5 py-0.5 text-steel-bright tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                      {done ? ' · done' : ''}
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] tabular-nums bg-surface-overlay/85 border border-signal-volt/30 px-1.5 py-0.5 text-signal-volt">
                      {setsDone}/{setsTotal}
                    </span>
                  </span>
                  <span className="block px-2.5 py-2">
                    <span className="block text-xs font-bold text-steel-bright leading-snug line-clamp-2">
                      {ex.exercise?.name || `Exercise ${i + 1}`}
                    </span>
                    <span className="block text-[10px] text-steel-muted uppercase tracking-wider mt-0.5">
                      {ex.sets} × {ex.reps}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {log.completedAt && (
        <div className="notice animate-set-complete">
          Session complete. Sets are saved on this device until the workout-log API ships.
        </div>
      )}

      <RestTimer seconds={restSeconds} active={resting} onComplete={finishRest} onSkip={finishRest} />
    </div>
  );
}
