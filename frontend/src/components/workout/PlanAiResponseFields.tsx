'use client';

import type { ActivePlanDay, PlanDayPatch, WorkoutExercise } from '@/lib/types';

const ACTIONS = ['KEEP', 'SWAP', 'ADD', 'REMOVE'] as const;

export type EditExerciseRow = {
  exerciseId: string;
  name: string;
  action: (typeof ACTIONS)[number];
  sets: number;
  reps: string;
  rpe: string;
  restSeconds: string;
};

export type EditDayRow = {
  dayOfWeek: string | number;
  exercises: EditExerciseRow[];
};

function exerciseName(ex: WorkoutExercise) {
  return ex.exercise?.name || String(ex.exerciseId).slice(-6);
}

export function daysFromActivePlan(days: ActivePlanDay[]): EditDayRow[] {
  return (days || []).map((day) => ({
    dayOfWeek: day.dayOfWeek,
    exercises: (day.exercises || []).map((ex) => ({
      exerciseId: String(ex.exerciseId),
      name: exerciseName(ex),
      action: (ACTIONS.includes(ex.action as (typeof ACTIONS)[number])
        ? ex.action
        : 'KEEP') as (typeof ACTIONS)[number],
      sets: Number(ex.sets) || 1,
      reps: String(ex.reps || ''),
      rpe: ex.rpe != null ? String(ex.rpe) : '',
      restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : '',
    })),
  }));
}

export function daysToPatch(days: EditDayRow[]): PlanDayPatch[] {
  return days.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    exercises: day.exercises.map((ex) => {
      const row: PlanDayPatch['exercises'][number] = {
        exerciseId: ex.exerciseId,
        action: ex.action,
        sets: Number(ex.sets) || 1,
        reps: ex.reps.trim() || '8-12',
      };
      if (ex.rpe.trim() !== '') row.rpe = Number(ex.rpe);
      if (ex.restSeconds.trim() !== '') row.restSeconds = Number(ex.restSeconds);
      return row;
    }),
  }));
}

type Props = {
  aiReason: string;
  onAiReasonChange: (value: string) => void;
  days: EditDayRow[] | null;
  onDaysChange: (next: EditDayRow[]) => void;
  loading?: boolean;
  planId: string;
};

export function PlanAiResponseFields({
  aiReason,
  onAiReasonChange,
  days,
  onDaysChange,
  loading,
  planId,
}: Props) {
  function patchExercise(
    dayIndex: number,
    exIndex: number,
    key: keyof EditExerciseRow,
    value: string | number,
  ) {
    if (!days) return;
    const next = days.map((day, di) => {
      if (di !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) =>
          ei === exIndex ? { ...ex, [key]: value } : ex,
        ),
      };
    });
    onDaysChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="field">
        <label htmlFor={`edit-ai-reason-${planId}`}>AI reason</label>
        <textarea
          id={`edit-ai-reason-${planId}`}
          rows={3}
          maxLength={2000}
          placeholder="Coaching rationale from the AI response"
          value={aiReason}
          onChange={(e) => onAiReasonChange(e.target.value)}
        />
      </div>

      <div>
        <p className="muted small mb-2">AI response — exercise prescriptions</p>
        {loading || !days ? (
          <p className="muted small">Loading plan days…</p>
        ) : days.length === 0 ? (
          <p className="muted small">No training days on this plan.</p>
        ) : (
          <div className="space-y-4">
            {days.map((day, dayIndex) => (
              <div key={`${day.dayOfWeek}-${dayIndex}`} className="space-y-2">
                <p className="font-headline-md text-steel-bright uppercase text-sm tracking-wide">
                  {String(day.dayOfWeek)}
                </p>
                {day.exercises.length === 0 ? (
                  <p className="muted small">Rest / empty</p>
                ) : (
                  <ul className="space-y-3">
                    {day.exercises.map((ex, exIndex) => (
                      <li
                        key={`${ex.exerciseId}-${exIndex}`}
                        className="border border-surface-highlight p-3 space-y-2"
                      >
                        <p className="text-sm text-steel-bright">{ex.name}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="field">
                            <label htmlFor={`act-${planId}-${dayIndex}-${exIndex}`}>Action</label>
                            <select
                              id={`act-${planId}-${dayIndex}-${exIndex}`}
                              value={ex.action}
                              onChange={(e) =>
                                patchExercise(
                                  dayIndex,
                                  exIndex,
                                  'action',
                                  e.target.value as EditExerciseRow['action'],
                                )
                              }
                            >
                              {ACTIONS.map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`sets-${planId}-${dayIndex}-${exIndex}`}>Sets</label>
                            <input
                              id={`sets-${planId}-${dayIndex}-${exIndex}`}
                              type="number"
                              min={1}
                              max={20}
                              value={ex.sets}
                              onChange={(e) =>
                                patchExercise(dayIndex, exIndex, 'sets', Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`reps-${planId}-${dayIndex}-${exIndex}`}>Reps</label>
                            <input
                              id={`reps-${planId}-${dayIndex}-${exIndex}`}
                              type="text"
                              maxLength={32}
                              value={ex.reps}
                              onChange={(e) =>
                                patchExercise(dayIndex, exIndex, 'reps', e.target.value)
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`rpe-${planId}-${dayIndex}-${exIndex}`}>RPE</label>
                            <input
                              id={`rpe-${planId}-${dayIndex}-${exIndex}`}
                              type="number"
                              min={1}
                              max={10}
                              step={0.5}
                              value={ex.rpe}
                              placeholder="—"
                              onChange={(e) =>
                                patchExercise(dayIndex, exIndex, 'rpe', e.target.value)
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`rest-${planId}-${dayIndex}-${exIndex}`}>
                              Rest (sec)
                            </label>
                            <input
                              id={`rest-${planId}-${dayIndex}-${exIndex}`}
                              type="number"
                              min={0}
                              max={600}
                              value={ex.restSeconds}
                              placeholder="—"
                              onChange={(e) =>
                                patchExercise(dayIndex, exIndex, 'restSeconds', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
