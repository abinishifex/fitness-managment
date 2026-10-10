'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActivePlanDay, Exercise, PlanDayPatch, WorkoutExercise } from '@/lib/types';
import {
  EXERCISE_TYPES,
  resolveExerciseType,
  type ExerciseTypeKey,
} from '@/lib/exerciseMedia';
import { ConfirmModal } from '@/components/ConfirmModal';
import { offlineApi, peekExercises } from '@/lib/offline';

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

const WEEKDAY_ALIASES: Record<string, WeekdayName> = {
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
};

/** 1–7 → Monday–Sunday (ISO-style). */
const NUMBER_TO_WEEKDAY: Record<number, WeekdayName> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function normalizeWeekday(value: string | number): WeekdayName | null {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(String(value).trim()))) {
    const n = Number(value);
    return NUMBER_TO_WEEKDAY[n] || null;
  }
  const raw = String(value).trim();
  const key = raw.toLowerCase();
  if (WEEKDAY_ALIASES[key]) return WEEKDAY_ALIASES[key];
  const dayN = key.match(/^day\s*(\d+)$/);
  if (dayN) {
    const n = Number(dayN[1]);
    return NUMBER_TO_WEEKDAY[n] || null;
  }
  return null;
}

export type EditExerciseRow = {
  exerciseId: string;
  name: string;
  action: 'KEEP' | 'SWAP' | 'ADD' | 'REMOVE';
  sets: number;
  reps: string;
  rpe: string;
  restSeconds: string;
};

export type EditDayRow = {
  dayOfWeek: WeekdayName;
  exercises: EditExerciseRow[];
};

function exerciseName(ex: WorkoutExercise) {
  return ex.exercise?.name || String(ex.exerciseId).slice(-6);
}

function weekdaySortIndex(day: string | number) {
  const name = normalizeWeekday(day);
  return name ? WEEKDAYS.indexOf(name) : 99;
}

function sortDays(days: EditDayRow[]): EditDayRow[] {
  return [...days].sort(
    (a, b) => weekdaySortIndex(a.dayOfWeek) - weekdaySortIndex(b.dayOfWeek),
  );
}

function defaultExerciseRow(ex: Exercise): EditExerciseRow {
  return {
    exerciseId: String(ex._id),
    name: ex.name,
    action: 'KEEP',
    sets: 3,
    reps: '8-12',
    rpe: '',
    restSeconds: '90',
  };
}

export function daysFromActivePlan(days: ActivePlanDay[]): EditDayRow[] {
  const used = new Set<WeekdayName>();
  const mapped = (days || []).map((day, index) => {
    let weekday = normalizeWeekday(day.dayOfWeek);
    if (!weekday || used.has(weekday)) {
      // Prefer an unused weekday so "Day 1/2/3" or collisions don't collapse.
      weekday =
        WEEKDAYS.find((w) => !used.has(w)) || WEEKDAYS[Math.min(index, 6)] || 'Monday';
    }
    used.add(weekday);
    return {
      dayOfWeek: weekday,
      exercises: (day.exercises || []).map((ex) => ({
        exerciseId: String(ex.exerciseId),
        name: exerciseName(ex),
        action: 'KEEP' as const,
        sets: Number(ex.sets) || 1,
        reps: String(ex.reps || ''),
        rpe: ex.rpe != null ? String(ex.rpe) : '',
        restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : '',
      })),
    };
  });

  return sortDays(mapped);
}

export function daysToPatch(days: EditDayRow[]): PlanDayPatch[] {
  return sortDays(days).map((day) => ({
    dayOfWeek: normalizeWeekday(day.dayOfWeek) || day.dayOfWeek,
    exercises: day.exercises.map((ex) => {
      const row: PlanDayPatch['exercises'][number] = {
        exerciseId: ex.exerciseId,
        action: 'KEEP',
        sets: Number(ex.sets) || 1,
        reps: ex.reps.trim() || '8-12',
      };
      if (ex.rpe.trim() !== '') row.rpe = Number(ex.rpe);
      if (ex.restSeconds.trim() !== '') row.restSeconds = Number(ex.restSeconds);
      return row;
    }),
  }));
}

type PickerMode =
  | { kind: 'add'; dayIndex: number }
  | { kind: 'replace'; dayIndex: number; exIndex: number }
  | null;

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
} | null;

type Props = {
  aiReason: string;
  onAiReasonChange: (value: string) => void;
  days: EditDayRow[] | null;
  onDaysChange: (next: EditDayRow[]) => void;
  loading?: boolean;
  planId: string;
};

export function PlanDaysEditor({
  aiReason,
  onAiReasonChange,
  days,
  onDaysChange,
  loading,
  planId,
}: Props) {
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [picker, setPicker] = useState<PickerMode>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerType, setPickerType] = useState<ExerciseTypeKey | ''>('');
  const [activeDay, setActiveDay] = useState<WeekdayName | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  useEffect(() => {
    const cached = peekExercises();
    if (cached?.exercises?.length) setCatalog(cached.exercises);

    let cancelled = false;
    setCatalogLoading(true);
    offlineApi
      .listExercises({ limit: '100' })
      .then((result) => {
        if (!cancelled) setCatalog(result.data.exercises || []);
      })
      .catch(() => {
        /* keep cache if any */
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!days?.length) {
      setActiveDay(null);
      return;
    }
    if (!activeDay || !days.some((d) => d.dayOfWeek === activeDay)) {
      setActiveDay(days[0].dayOfWeek);
    }
  }, [days, activeDay]);

  const selectedWeekdays = useMemo(() => {
    const set = new Set<WeekdayName>();
    for (const day of days || []) {
      const name = normalizeWeekday(day.dayOfWeek);
      if (name) set.add(name);
    }
    return set;
  }, [days]);

  const filteredCatalog = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return catalog.filter((ex) => {
      const matchesType = pickerType
        ? resolveExerciseType(ex.primaryMuscles).key === pickerType
        : true;
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscles.some((m) => m.includes(q)) ||
        ex.type.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [catalog, pickerQuery, pickerType]);

  function commit(next: EditDayRow[]) {
    onDaysChange(sortDays(next));
  }

  function toggleWeekday(weekday: WeekdayName) {
    if (!days) return;
    const exists = days.some((d) => d.dayOfWeek === weekday);
    if (exists) {
      const day = days.find((d) => d.dayOfWeek === weekday);
      if (day && day.exercises.length > 0) {
        setConfirm({
          title: 'Remove day',
          message: `Remove ${weekday}? It has ${day.exercises.length} exercise(s).`,
          confirmLabel: 'Remove',
          onConfirm: () => {
            commit(days.filter((d) => d.dayOfWeek !== weekday));
            setConfirm(null);
          },
        });
        return;
      }
      const next = days.filter((d) => d.dayOfWeek !== weekday);
      commit(next);
      return;
    }
    commit([...days, { dayOfWeek: weekday, exercises: [] }]);
    setActiveDay(weekday);
  }

  function duplicateDayTo(dayIndex: number, target: WeekdayName) {
    if (!days) return;
    const source = days[dayIndex];
    if (!source || source.dayOfWeek === target) return;

    const copied = source.exercises.map((ex) => ({ ...ex }));
    const targetIndex = days.findIndex((d) => d.dayOfWeek === target);

    if (targetIndex === -1) {
      commit([...days, { dayOfWeek: target, exercises: copied }]);
      setActiveDay(target);
      return;
    }

    const targetDay = days[targetIndex];
    if (targetDay.exercises.length > 0) {
      setConfirm({
        title: 'Replace exercises',
        message: `Replace ${target}'s ${targetDay.exercises.length} exercise(s) with a copy from ${source.dayOfWeek}?`,
        confirmLabel: 'Replace',
        onConfirm: () => {
          commit(
            days.map((day, i) => (i === targetIndex ? { ...day, exercises: copied } : day)),
          );
          setActiveDay(target);
          setConfirm(null);
        },
      });
      return;
    }

    commit(
      days.map((day, i) => (i === targetIndex ? { ...day, exercises: copied } : day)),
    );
    setActiveDay(target);
  }

  function patchExercise(
    dayIndex: number,
    exIndex: number,
    key: keyof EditExerciseRow,
    value: string | number,
  ) {
    if (!days) return;
    commit(
      days.map((day, di) => {
        if (di !== dayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, ei) =>
            ei === exIndex ? { ...ex, [key]: value } : ex,
          ),
        };
      }),
    );
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    if (!days) return;
    commit(
      days.map((day, di) => {
        if (di !== dayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.filter((_, ei) => ei !== exIndex),
        };
      }),
    );
  }

  function moveExercise(dayIndex: number, exIndex: number, direction: -1 | 1) {
    if (!days) return;
    const day = days[dayIndex];
    if (!day) return;
    const target = exIndex + direction;
    if (target < 0 || target >= day.exercises.length) return;
    const exercises = [...day.exercises];
    const [row] = exercises.splice(exIndex, 1);
    exercises.splice(target, 0, row);
    commit(days.map((d, di) => (di === dayIndex ? { ...d, exercises } : d)));
  }

  function applyPickerSelection(ex: Exercise) {
    if (!days || !picker) return;
    if (picker.kind === 'add') {
      commit(
        days.map((day, di) =>
          di === picker.dayIndex
            ? { ...day, exercises: [...day.exercises, defaultExerciseRow(ex)] }
            : day,
        ),
      );
    } else {
      commit(
        days.map((day, di) => {
          if (di !== picker.dayIndex) return day;
          return {
            ...day,
            exercises: day.exercises.map((row, ei) =>
              ei === picker.exIndex
                ? {
                    ...row,
                    exerciseId: String(ex._id),
                    name: ex.name,
                    action: 'KEEP',
                  }
                : row,
            ),
          };
        }),
      );
    }
    setPicker(null);
    setPickerQuery('');
    setPickerType('');
  }

  const activeDayIndex =
    days && activeDay ? days.findIndex((d) => d.dayOfWeek === activeDay) : -1;
  const activeDayRow = activeDayIndex >= 0 && days ? days[activeDayIndex] : null;

  return (
    <div className="space-y-4">
      <div className="field">
        <label htmlFor={`edit-ai-reason-${planId}`}>AI reason</label>
        <textarea
          id={`edit-ai-reason-${planId}`}
          rows={3}
          maxLength={2000}
          placeholder="Coaching rationale"
          value={aiReason}
          onChange={(e) => onAiReasonChange(e.target.value)}
        />
      </div>

      <div>
        <p className="muted small mb-2">Training days</p>
        {loading || !days ? (
          <p className="muted small">Loading plan days…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((weekday) => {
                const on = selectedWeekdays.has(weekday);
                const short = weekday.slice(0, 3);
                return (
                  <button
                    key={weekday}
                    type="button"
                    className={`btn ${on ? '' : 'secondary'}`}
                    aria-pressed={on}
                    onClick={() => toggleWeekday(weekday)}
                    title={on ? `Remove ${weekday}` : `Add ${weekday}`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
            <p className="muted small mt-2">
              Toggle weekdays to add or remove training days. Select a day below to edit exercises
              or duplicate it to another weekday.
            </p>

            {days.length === 0 ? (
              <p className="muted small mt-3">No training days — toggle a weekday to start.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {days.map((day) => (
                    <button
                      key={day.dayOfWeek}
                      type="button"
                      className={`btn ${activeDay === day.dayOfWeek ? '' : 'secondary'}`}
                      onClick={() => setActiveDay(day.dayOfWeek)}
                    >
                      {day.dayOfWeek}
                      <span className="ml-1 opacity-70 text-[10px]">
                        ({day.exercises.length})
                      </span>
                    </button>
                  ))}
                </div>

                {activeDayRow && activeDayIndex >= 0 ? (
                  <div className="border border-surface-highlight p-3 space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="font-headline-md text-steel-bright uppercase text-sm tracking-wide">
                          {activeDayRow.dayOfWeek}
                        </p>
                        <p className="muted small">
                          {activeDayRow.exercises.length === 0
                            ? 'Rest / empty — add exercises below'
                            : `${activeDayRow.exercises.length} exercise(s)`}
                        </p>
                      </div>
                      <div className="field min-w-[10rem]">
                        <label htmlFor={`dup-${planId}-${activeDayIndex}`}>Duplicate to</label>
                        <select
                          id={`dup-${planId}-${activeDayIndex}`}
                          value=""
                          disabled={activeDayRow.exercises.length === 0}
                          onChange={(e) => {
                            const target = e.target.value as WeekdayName;
                            if (target) duplicateDayTo(activeDayIndex, target);
                          }}
                        >
                          <option value="">Choose day…</option>
                          {WEEKDAYS.filter((w) => w !== activeDayRow.dayOfWeek).map((w) => (
                            <option key={w} value={w}>
                              {w}
                              {!selectedWeekdays.has(w) ? ' (adds day)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {activeDayRow.exercises.length === 0 ? (
                      <p className="muted small">No exercises on this day yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {activeDayRow.exercises.map((ex, exIndex) => (
                          <li
                            key={`${ex.exerciseId}-${exIndex}`}
                            className="border border-surface-highlight p-3 space-y-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm text-steel-bright">{ex.name}</p>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  className="btn secondary"
                                  disabled={exIndex === 0}
                                  onClick={() => moveExercise(activeDayIndex, exIndex, -1)}
                                  aria-label="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="btn secondary"
                                  disabled={exIndex === activeDayRow.exercises.length - 1}
                                  onClick={() => moveExercise(activeDayIndex, exIndex, 1)}
                                  aria-label="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="btn secondary"
                                  onClick={() =>
                                    setPicker({
                                      kind: 'replace',
                                      dayIndex: activeDayIndex,
                                      exIndex,
                                    })
                                  }
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  className="btn secondary"
                                  onClick={() => removeExercise(activeDayIndex, exIndex)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="field">
                                <label htmlFor={`sets-${planId}-${activeDayIndex}-${exIndex}`}>
                                  Sets
                                </label>
                                <input
                                  id={`sets-${planId}-${activeDayIndex}-${exIndex}`}
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={ex.sets}
                                  onChange={(e) =>
                                    patchExercise(
                                      activeDayIndex,
                                      exIndex,
                                      'sets',
                                      Number(e.target.value),
                                    )
                                  }
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`reps-${planId}-${activeDayIndex}-${exIndex}`}>
                                  Reps
                                </label>
                                <input
                                  id={`reps-${planId}-${activeDayIndex}-${exIndex}`}
                                  type="text"
                                  maxLength={32}
                                  value={ex.reps}
                                  onChange={(e) =>
                                    patchExercise(
                                      activeDayIndex,
                                      exIndex,
                                      'reps',
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`rpe-${planId}-${activeDayIndex}-${exIndex}`}>
                                  RPE
                                </label>
                                <input
                                  id={`rpe-${planId}-${activeDayIndex}-${exIndex}`}
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={0.5}
                                  value={ex.rpe}
                                  placeholder="—"
                                  onChange={(e) =>
                                    patchExercise(
                                      activeDayIndex,
                                      exIndex,
                                      'rpe',
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <div className="field">
                                <label htmlFor={`rest-${planId}-${activeDayIndex}-${exIndex}`}>
                                  Rest (sec)
                                </label>
                                <input
                                  id={`rest-${planId}-${activeDayIndex}-${exIndex}`}
                                  type="number"
                                  min={0}
                                  max={600}
                                  value={ex.restSeconds}
                                  placeholder="—"
                                  onChange={(e) =>
                                    patchExercise(
                                      activeDayIndex,
                                      exIndex,
                                      'restSeconds',
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPicker({ kind: 'add', dayIndex: activeDayIndex })}
                    >
                      Add exercise
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />

      {picker ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={picker.kind === 'add' ? 'Add exercise' : 'Replace exercise'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPicker(null);
          }}
        >
          <div className="w-full max-w-lg max-h-[80vh] overflow-hidden border border-surface-highlight bg-surface-base flex flex-col">
            <div className="p-4 border-b border-surface-highlight space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-headline-md text-steel-bright uppercase text-sm tracking-wide">
                  {picker.kind === 'add' ? 'Add exercise' : 'Replace exercise'}
                </p>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPicker(null)}
                >
                  Close
                </button>
              </div>
              <div className="field">
                <label htmlFor={`picker-q-${planId}`}>Search</label>
                <input
                  id={`picker-q-${planId}`}
                  type="search"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Name, muscle, type…"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={`btn ${pickerType === '' ? '' : 'secondary'}`}
                  onClick={() => setPickerType('')}
                >
                  All
                </button>
                {EXERCISE_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`btn ${pickerType === t.key ? '' : 'secondary'}`}
                    onClick={() => setPickerType(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <ul className="overflow-y-auto p-2 space-y-1">
              {catalogLoading && catalog.length === 0 ? (
                <li className="muted small p-3">Loading catalogue…</li>
              ) : filteredCatalog.length === 0 ? (
                <li className="muted small p-3">No exercises match.</li>
              ) : (
                filteredCatalog.map((ex) => (
                  <li key={ex._id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 border border-transparent hover:border-surface-highlight hover:bg-surface-overlay/40"
                      onClick={() => applyPickerSelection(ex)}
                    >
                      <span className="text-sm text-steel-bright">{ex.name}</span>
                      <span className="block muted small">
                        {resolveExerciseType(ex.primaryMuscles).label}
                        {ex.primaryMuscles.length
                          ? ` · ${ex.primaryMuscles.slice(0, 3).join(', ')}`
                          : ''}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
