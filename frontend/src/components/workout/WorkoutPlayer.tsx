'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TodayWorkout } from '@/lib/types';
import { getExerciseImage } from '@/lib/exerciseMedia';
import {
  createSessionLog,
  loadSessionLog,
  saveSessionLog,
  sessionProgress,
  type SessionLog,
  type SetLog,
} from '@/lib/sessionLog';
import { ProgressRing } from './ProgressRing';
import { RestTimer } from './RestTimer';
import { SetTracker } from './SetTracker';

type Props = { workout: TodayWorkout };

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

  const current = workout.exercises[activeExercise];
  const currentLog = log?.exercises[activeExercise];
  const activeSetIndex = currentLog?.sets.findIndex((s) => !s.completed) ?? 0;
  const image = getExerciseImage(current?.exercise?.primaryMuscles || []);
  const restSeconds = current?.restSeconds || 90;

  function patchSet(index: number, patch: Partial<SetLog>) {
    if (!log || !currentLog) return;
    const next = structuredClone(log);
    next.exercises[activeExercise].sets[index] = {
      ...next.exercises[activeExercise].sets[index],
      ...patch,
    };
    persist(next);
  }

  function completeSet(index: number) {
    if (!log) return;
    const next = structuredClone(log);
    next.exercises[activeExercise].sets[index] = {
      ...next.exercises[activeExercise].sets[index],
      completed: true,
      completedAt: new Date().toISOString(),
    };
    const allDone = next.exercises[activeExercise].sets.every((s) => s.completed);
    if (allDone && activeExercise < workout.exercises.length - 1) {
      persist(next);
      setResting(true);
      return;
    }
    if (next.exercises.every((ex) => ex.sets.every((s) => s.completed))) {
      next.completedAt = new Date().toISOString();
    }
    persist(next);
    if (!allDone) setResting(true);
  }

  function finishRest() {
    setResting(false);
    if (!log) return;
    const currentDone = log.exercises[activeExercise].sets.every((s) => s.completed);
    if (currentDone && activeExercise < workout.exercises.length - 1) {
      setActiveExercise((i) => i + 1);
    }
  }

  if (!log || !current || !currentLog) return null;

  const name = current.exercise?.name || `Exercise ${activeExercise + 1}`;
  const muscles = current.exercise?.primaryMuscles?.join(' · ') || 'compound';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="relative flex-1 min-h-[280px] overflow-hidden border border-surface-highlight animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover brightness-[0.7] contrast-125 animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(212,255,0,0.14),transparent_45%)] animate-glow-sweep" />
          <div className="relative z-10 h-full flex flex-col justify-between p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 bg-surface-overlay/85 border border-signal-volt/40 px-3 py-1 text-label-telemetry text-signal-volt uppercase tracking-widest text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-volt animate-ping" />
                Live session · {workout.dayOfWeek}
              </span>
              <span className="text-label-telemetry text-steel-muted text-[10px] uppercase">
                {activeExercise + 1} / {workout.exercises.length}
              </span>
            </div>
            <div>
              <p className="text-label-telemetry text-signal-volt uppercase tracking-wider text-xs mb-2">
                {current.exercise?.type || 'movement'} · {muscles}
              </p>
              <h2 className="font-headline-xl text-display-hero-mobile md:text-headline-xl uppercase text-steel-bright leading-none">
                {name}
              </h2>
              <p className="mt-3 text-steel-muted text-sm max-w-xl">
                {current.exercise?.instructions || 'Perform with controlled tempo and full range.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="tag">{current.sets} sets</span>
                <span className="tag">{current.reps} reps</span>
                {current.rpe != null && <span className="tag">RPE {current.rpe}</span>}
                <span className="tag">Rest {restSeconds}s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-56 border border-surface-highlight bg-surface-raised p-5 flex flex-col items-center justify-center gap-4 animate-fade-up delay-100">
          <ProgressRing value={progress.pct} size={140} stroke={9} sublabel="session" pulse={progress.pct > 0 && progress.pct < 100} />
          <div className="text-center">
            <p className="font-headline-md text-steel-bright text-2xl">{progress.done}/{progress.total}</p>
            <p className="text-label-telemetry text-steel-muted uppercase text-[10px] tracking-wider">
              Sets complete
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {workout.exercises.map((ex, i) => {
          const done = log.exercises[i]?.sets.every((s) => s.completed);
          return (
            <button
              key={`${ex.exerciseId}-${i}`}
              type="button"
              onClick={() => setActiveExercise(i)}
              className={`shrink-0 px-4 py-2 border text-left transition-colors ${
                i === activeExercise
                  ? 'border-signal-volt bg-signal-volt text-surface-base'
                  : done
                    ? 'border-signal-volt/40 text-signal-volt'
                    : 'border-surface-highlight text-steel-muted hover:text-steel-bright'
              }`}
            >
              <span className="block text-[10px] font-label-telemetry uppercase tracking-wider opacity-80">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="block text-xs font-bold max-w-[120px] truncate">
                {ex.exercise?.name || `Exercise ${i + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="animate-fade-up delay-150">
          <div className="eyebrow mb-3">Set tracker</div>
          <SetTracker
            sets={currentLog.sets}
            targetReps={current.reps}
            activeIndex={activeSetIndex < 0 ? currentLog.sets.length - 1 : activeSetIndex}
            onChange={patchSet}
            onComplete={completeSet}
          />
        </div>

        <div className="space-y-4 animate-fade-up delay-200">
          {current.exercise?.formCues?.length ? (
            <div className="border border-surface-highlight bg-surface-raised p-5">
              <div className="eyebrow mb-3">Form cues</div>
              <ul className="space-y-2">
                {current.exercise.formCues.map((cue) => (
                  <li key={cue} className="flex gap-2 text-sm text-steel-bright">
                    <span className="text-signal-volt mt-0.5">▸</span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border border-surface-highlight bg-surface-raised p-5">
            <div className="eyebrow mb-3">Equipment</div>
            <p className="text-sm text-steel-muted">
              {(current.exercise?.equipmentRequired || ['bodyweight']).map((e) => e.replaceAll('_', ' ')).join(' · ')}
            </p>
            {current.exercise?.difficulty && (
              <p className="mt-3 text-label-telemetry text-signal-volt uppercase text-[10px] tracking-wider">
                {current.exercise.difficulty} · {current.exercise.movementPattern?.replaceAll('_', ' ') || 'pattern'}
              </p>
            )}
          </div>

          {log.completedAt && (
            <div className="notice animate-set-complete">
              Session complete. Your sets are saved on this device until the workout-log API ships.
            </div>
          )}
        </div>
      </div>

      <RestTimer
        seconds={restSeconds}
        active={resting}
        onComplete={finishRest}
        onSkip={finishRest}
      />
    </div>
  );
}
