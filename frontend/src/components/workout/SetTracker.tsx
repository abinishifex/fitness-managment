'use client';

import type { SetLog } from '@/lib/sessionLog';

type Props = {
  sets: SetLog[];
  targetReps: string;
  activeIndex: number;
  onChange: (index: number, patch: Partial<SetLog>) => void;
  onComplete: (index: number) => void;
};

export function SetTracker({ sets, targetReps, activeIndex, onChange, onComplete }: Props) {
  return (
    <div className="space-y-3">
      {sets.map((set, i) => {
        const isActive = i === activeIndex && !set.completed;
        const isLocked = i > activeIndex && !set.completed;
        return (
          <div
            key={i}
            className={`border p-4 transition-all duration-300 ${
              set.completed
                ? 'border-signal-volt/50 bg-signal-volt/5 animate-set-complete'
                : isActive
                  ? 'border-signal-volt bg-surface-raised shadow-[0_0_24px_rgba(212,255,0,0.15)]'
                  : 'border-surface-highlight bg-surface-raised/60 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 flex items-center justify-center font-headline-md text-sm ${
                    set.completed
                      ? 'bg-signal-volt text-surface-base'
                      : isActive
                        ? 'bg-surface-highlight text-signal-volt animate-soft-pulse'
                        : 'bg-surface-highlight text-steel-muted'
                  }`}
                >
                  {set.completed ? (
                    <span className="material-symbols-outlined text-lg">check</span>
                  ) : (
                    i + 1
                  )}
                </span>
                <div>
                  <p className="font-label-telemetry uppercase text-xs tracking-wider text-steel-bright">
                    Set {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="text-[11px] text-steel-muted">Target {targetReps} reps</p>
                </div>
              </div>
              {set.completed && (
                <span className="text-label-telemetry text-signal-volt text-[10px] uppercase tracking-wider">
                  Logged
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="field !m-0">
                <span className="text-[11px] text-steel-muted uppercase tracking-wider">kg</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  disabled={set.completed || isLocked}
                  value={set.weightKg}
                  onChange={(e) => onChange(i, { weightKg: e.target.value })}
                  placeholder="0"
                  className="mt-1"
                />
              </label>
              <label className="field !m-0">
                <span className="text-[11px] text-steel-muted uppercase tracking-wider">reps</span>
                <input
                  type="number"
                  min="0"
                  disabled={set.completed || isLocked}
                  value={set.reps}
                  onChange={(e) => onChange(i, { reps: e.target.value })}
                  placeholder={targetReps.split('-')[0] || '8'}
                  className="mt-1"
                />
              </label>
            </div>

            {isActive && (
              <button
                type="button"
                className="btn w-full mt-4 custom-glow"
                disabled={!set.reps}
                onClick={() => onComplete(i)}
              >
                Complete set
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
