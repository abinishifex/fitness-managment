'use client';

import type { SetLog } from '@/lib/sessionLog';

type Props = {
  sets: SetLog[];
  targetReps: string;
  activeIndex: number;
  exerciseDone: boolean;
  onComplete: (index: number) => void;
  onRepeat: () => void;
  onNextExercise?: () => void;
  hasNextExercise?: boolean;
};

export function SetTracker({
  sets,
  targetReps,
  activeIndex,
  exerciseDone,
  onComplete,
  onRepeat,
  onNextExercise,
  hasNextExercise,
}: Props) {
  const done = sets.filter((s) => s.completed).length;
  const current = exerciseDone ? sets.length : Math.min(activeIndex + 1, sets.length);

  return (
    <div className="border border-surface-highlight bg-surface-raised/80 p-5 md:p-6 flex flex-col gap-5 h-full">
      <div>
        <p className="text-label-telemetry text-signal-volt uppercase tracking-[0.2em] text-[10px]">
          Set counter
        </p>
        <p
          key={`${done}-${current}`}
          className="font-headline-xl text-steel-bright text-6xl md:text-7xl leading-none mt-2 tabular-nums animate-soft-pulse"
        >
          {String(current).padStart(2, '0')}
          <span className="text-3xl text-steel-muted">/{String(sets.length).padStart(2, '0')}</span>
        </p>
        <p className="mt-2 text-sm text-steel-muted">
          Target {targetReps} reps · tap complete after each set
        </p>
      </div>

      <div className="flex items-center gap-2" aria-label={`${done} of ${sets.length} sets complete`}>
        {sets.map((set, i) => (
          <button
            key={i}
            type="button"
            disabled={set.completed || i !== activeIndex}
            onClick={() => onComplete(i)}
            className={`h-10 flex-1 flex items-center justify-center text-sm font-bold border transition-all ${
              set.completed
                ? 'bg-signal-volt text-surface-base border-signal-volt'
                : i === activeIndex
                  ? 'border-signal-volt text-signal-volt bg-signal-volt/10 animate-soft-pulse'
                  : 'border-surface-highlight text-steel-muted opacity-50'
            }`}
            aria-label={set.completed ? `Set ${i + 1} done` : `Complete set ${i + 1}`}
          >
            {set.completed ? (
              <span className="material-symbols-outlined text-lg">check</span>
            ) : (
              i + 1
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto space-y-3">
        {!exerciseDone ? (
          <button
            type="button"
            className="btn w-full custom-glow text-base py-4"
            onClick={() => onComplete(activeIndex)}
          >
            Complete set {activeIndex + 1}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="notice animate-set-complete !mb-0">
              All sets logged for this move.
            </div>
            {hasNextExercise && onNextExercise && (
              <button type="button" className="btn w-full custom-glow text-base py-4" onClick={onNextExercise}>
                Next exercise
              </button>
            )}
          </div>
        )}

        <button type="button" className="btn secondary w-full" onClick={onRepeat}>
          Repeat exercise
        </button>
      </div>
    </div>
  );
}
