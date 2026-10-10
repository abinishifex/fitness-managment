'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ActivePlan, ActivePlanDay, TodayWorkout, WorkoutExercise } from '@/lib/types';
import { getExerciseImage, resolveExerciseType } from '@/lib/exerciseMedia';
import {
  completedDatesSet,
  computeTrainingStreak,
  eatDateKey,
  getArchivedSession,
  loadSessionArchive,
  loadSessionHistory,
  loadSessionLog,
  sessionProgress,
  weekDateKeys,
  weekdayLongFromKey,
  weekdayShortFromKey,
  type SessionArchiveEntry,
  type SessionHistoryEntry,
} from '@/lib/sessionLog';

const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / lower',
  push_pull_legs: 'Push / pull / legs',
  bro_split: 'Bro split',
};

type DayStatus = 'rest' | 'done' | 'today' | 'upcoming' | 'missed';
type ExploreTab = 'week' | 'streak' | 'fix';

type JourneyDay = {
  dateKey: string;
  short: string;
  long: string;
  isToday: boolean;
  isRest: boolean;
  status: DayStatus;
  moveCount: number;
  focusLabel: string;
  focusImage: string;
  exercises: WorkoutExercise[];
};

type FixCue = {
  icon: string;
  title: string;
  detail: string;
  tone: 'good' | 'fix' | 'info';
};

function matchPlanDay(planDays: ActivePlanDay[], weekdayLong: string, weekdayNumber: number) {
  return planDays.find(
    (day) =>
      String(day.dayOfWeek).toLowerCase() === weekdayLong.toLowerCase() ||
      Number(day.dayOfWeek) === weekdayNumber
  );
}

function weekdayNumberFromKey(dateKey: string) {
  const utcDay = new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function focusFromExercises(exercises: WorkoutExercise[]) {
  if (!exercises.length) {
    return { label: 'Rest', image: '/exercises/fullbody.jpg' };
  }
  const type = resolveExerciseType(exercises[0]?.exercise?.primaryMuscles || []);
  return { label: type.label, image: getExerciseImage(exercises[0]?.exercise?.primaryMuscles || []) };
}

function buildJourney(
  plan: ActivePlan,
  completed: Set<string>,
  todayKey: string
): JourneyDay[] {
  return weekDateKeys(todayKey).map((dateKey) => {
    const long = weekdayLongFromKey(dateKey);
    const short = weekdayShortFromKey(dateKey);
    const number = weekdayNumberFromKey(dateKey);
    const match = matchPlanDay(plan.days, long, number);
    const exercises = match?.exercises || [];
    const isRest = exercises.length === 0;
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;
    const done = completed.has(dateKey);
    const focus = focusFromExercises(exercises);

    let status: DayStatus;
    if (isRest) status = 'rest';
    else if (done) status = 'done';
    else if (isToday) status = 'today';
    else if (isPast) status = 'missed';
    else status = 'upcoming';

    return {
      dateKey,
      short,
      long,
      isToday,
      isRest,
      status,
      moveCount: exercises.length,
      focusLabel: focus.label,
      focusImage: focus.image,
      exercises,
    };
  });
}

function buildFixCues(
  day: JourneyDay,
  archive: SessionArchiveEntry | null,
  nextTraining: JourneyDay | null
): FixCue[] {
  const cues: FixCue[] = [];

  if (day.isRest) {
    cues.push({
      icon: 'spa',
      title: 'Recover on purpose',
      detail: 'Sleep, walk, and hydrate. Your next training day is already on the path.',
      tone: 'info',
    });
    if (nextTraining) {
      cues.push({
        icon: 'event',
        title: `Next train · ${nextTraining.short}`,
        detail: `${nextTraining.focusLabel} · ${nextTraining.moveCount} moves. Preview it so nothing surprises you.`,
        tone: 'info',
      });
    }
    return cues;
  }

  if (day.status === 'done' && archive) {
    cues.push({
      icon: 'emoji_events',
      title: 'Session locked in',
      detail: `${archive.setsDone}/${archive.setsTotal} sets · ${archive.pct}% complete. That progress is yours.`,
      tone: 'good',
    });
    const weak = archive.exercises.filter((ex) => ex.setsDone < ex.setsTotal);
    if (weak.length) {
      cues.push({
        icon: 'build',
        title: 'Finish these next time',
        detail: `${weak.length} lift${weak.length > 1 ? 's' : ''} had open sets — close every set on the next ${day.focusLabel} day.`,
        tone: 'fix',
      });
    } else {
      cues.push({
        icon: 'trending_up',
        title: 'Add a little next time',
        detail: `Same moves, slightly heavier or +1 rep. Protect form first — then progress.`,
        tone: 'good',
      });
    }
    const noLoad = archive.exercises.filter((ex) => ex.setsDone > 0 && !ex.lastWeightKg);
    if (noLoad.length) {
      cues.push({
        icon: 'edit_note',
        title: 'Log the load',
        detail: 'Weight was empty on some sets. Logging kg makes the next day smarter.',
        tone: 'fix',
      });
    }
    return cues;
  }

  if (day.status === 'missed') {
    cues.push({
      icon: 'restart_alt',
      title: 'Missed — reset, don’t spiral',
      detail: `Skip guilt. Show up on the next ${day.focusLabel} day and complete every planned set.`,
      tone: 'fix',
    });
    if (nextTraining) {
      cues.push({
        icon: 'flag',
        title: `Fix it on ${nextTraining.long}`,
        detail: `${nextTraining.focusLabel} · ${nextTraining.moveCount} moves. Start on time and finish the queue.`,
        tone: 'fix',
      });
    }
    return cues;
  }

  if (day.status === 'today') {
    if (archive && archive.pct > 0 && archive.pct < 100) {
      const open = archive.exercises.filter((ex) => ex.setsDone < ex.setsTotal);
      cues.push({
        icon: 'play_arrow',
        title: 'Session in progress',
        detail: `${archive.pct}% done. ${open.length} lift${open.length === 1 ? '' : 's'} still open — finish strong.`,
        tone: 'fix',
      });
    } else if (archive?.pct === 100) {
      cues.push({
        icon: 'check_circle',
        title: 'Today is complete',
        detail: 'Enjoy the win. Tap another day to scout what’s next.',
        tone: 'good',
      });
    } else {
      cues.push({
        icon: 'bolt',
        title: 'Ready when you are',
        detail: `${day.moveCount} moves · ${day.focusLabel}. Start the tracker and close every set.`,
        tone: 'info',
      });
    }
    return cues;
  }

  // upcoming
  cues.push({
    icon: 'visibility',
    title: 'Preview the work',
    detail: `${day.moveCount} planned moves for ${day.focusLabel}. Knowing the queue removes decision fatigue.`,
    tone: 'info',
  });
  if (archive && archive.pct > 0 && archive.pct < 100) {
    cues.push({
      icon: 'build',
      title: 'Carry-over fix',
      detail: 'A past attempt left sets open. This day is your chance to finish clean.',
      tone: 'fix',
    });
  }
  return cues;
}

type Props = {
  plan: ActivePlan | null;
  today?: TodayWorkout | null;
  loading?: boolean;
};

export function GeneralPlanOverview({ plan, today, loading }: Props) {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [archiveMap, setArchiveMap] = useState<Record<string, SessionArchiveEntry>>({});
  const [todayPct, setTodayPct] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<ExploreTab>('week');
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    setHistory(loadSessionHistory());
    const archive = loadSessionArchive();
    setArchiveMap(Object.fromEntries(archive.map((item) => [item.date, item])));

    if (today?.planId && today.date) {
      const log = loadSessionLog(today.planId, today.date);
      setTodayPct(log ? sessionProgress(log).pct : 0);
      if (log) {
        const snap = getArchivedSession(today.date);
        if (snap) setArchiveMap((prev) => ({ ...prev, [today.date]: snap }));
      }
    } else {
      setTodayPct(0);
    }
  }, [today?.planId, today?.date, plan?.planId]);

  const todayKey = today?.date || eatDateKey();
  const completed = useMemo(() => completedDatesSet(history), [history]);

  const journey = useMemo(
    () => (plan ? buildJourney(plan, completed, todayKey) : []),
    [plan, completed, todayKey]
  );

  useEffect(() => {
    if (!journey.length) return;
    const preferred =
      journey.find((d) => d.status === 'today') ||
      journey.find((d) => d.status === 'upcoming' && !d.isRest) ||
      journey.find((d) => d.isToday);
    setSelectedKey((prev) => prev || preferred?.dateKey || journey[0].dateKey);
  }, [journey]);

  const trainingWeekdays = useMemo(() => {
    if (!plan) return new Set<string>();
    const names = new Set<string>();
    for (const day of plan.days) {
      if (!(day.exercises || []).length) continue;
      const raw = String(day.dayOfWeek);
      if (/^\d+$/.test(raw)) {
        const hit = journey.find((j) => weekdayNumberFromKey(j.dateKey) === Number(raw));
        if (hit) names.add(hit.long);
      } else {
        names.add(raw);
      }
    }
    return names;
  }, [plan, journey]);

  const streak = useMemo(() => {
    if (!plan) return 0;
    return computeTrainingStreak(
      (weekday) => [...trainingWeekdays].some((w) => w.toLowerCase() === weekday.toLowerCase()),
      history
    );
  }, [plan, trainingWeekdays, history]);

  const selected = journey.find((d) => d.dateKey === selectedKey) || null;
  const nextTraining =
    journey.find((d) => d.dateKey > (selected?.dateKey || todayKey) && !d.isRest) ||
    journey.find((d) => !d.isRest && (d.status === 'today' || d.status === 'upcoming')) ||
    null;

  const selectedArchive = selected ? archiveMap[selected.dateKey] || null : null;
  const fixCues = selected ? buildFixCues(selected, selectedArchive, nextTraining) : [];

  if (loading) {
    return (
      <section className="animate-fade-up delay-150 border border-surface-highlight bg-surface-raised/30 p-5 md:p-6">
        <div className="flex items-center gap-2 text-steel-muted">
          <span className="material-symbols-outlined text-base animate-soft-pulse" aria-hidden>
            calendar_month
          </span>
          <span className="text-sm">Loading your plan…</span>
        </div>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="animate-fade-up delay-150 border border-dashed border-surface-highlight bg-surface-raised/20 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-steel-muted text-2xl" aria-hidden>
            route
          </span>
          <div>
            <div className="eyebrow">Your plan</div>
            <h2 className="font-headline-md text-steel-bright uppercase text-xl mt-1">No active plan yet</h2>
            <p className="muted small mt-2 max-w-md">
              Generate a plan to unlock your week, streak, and upcoming sessions.
            </p>
            <Link href="/app/onboarding" className="btn mt-4 inline-flex">
              Build plan
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const splitLabel = SPLIT_LABELS[plan.splitType] || plan.splitType.replace(/_/g, ' ');
  const trainingDays = journey.filter((d) => !d.isRest);
  const doneThisWeek = trainingDays.filter((d) => d.status === 'done').length;
  const weekTarget = trainingDays.length || plan.trainingDaysPerWeek;
  const weekPct = weekTarget ? Math.round((doneThisWeek / weekTarget) * 100) : 0;

  const loveLine =
    weekPct >= 100
      ? 'Week complete — tap any day to relive the wins.'
      : streak >= 3
        ? `${streak}-session streak. Tap days to scout what to fix next.`
        : 'Tap a day. Explore progress. Know exactly what to fix next.';

  function selectDay(dateKey: string) {
    setSelectedKey(dateKey);
    setTab('week');
    setPulseKey((n) => n + 1);
  }

  function selectMetric(next: ExploreTab, dayKey?: string) {
    setTab(next);
    if (dayKey) setSelectedKey(dayKey);
    setPulseKey((n) => n + 1);
  }

  return (
    <section
      className="animate-fade-up delay-150 border border-surface-highlight bg-surface-raised/25 overflow-hidden"
      aria-labelledby="general-plan-heading"
    >
      <div className="relative border-b border-surface-highlight">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(212,255,0,0.12),transparent_45%)]" />
        <div className="relative p-4 sm:p-5 md:p-6 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-xl">
              <div className="eyebrow inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-signal-volt" aria-hidden>
                  route
                </span>
                Your plan
              </div>
              <h2
                id="general-plan-heading"
                className="font-headline-md text-steel-bright uppercase text-2xl md:text-3xl mt-1 leading-none"
              >
                Stay on path.
              </h2>
              <p className="mt-3 text-steel-muted text-sm md:text-base leading-relaxed">{loveLine}</p>
              <p className="mt-2 text-[11px] font-label-telemetry uppercase tracking-wider text-steel-muted">
                {splitLabel}
                {plan.fitnessGoal ? ` · ${String(plan.fitnessGoal).replaceAll('_', ' ')}` : ''}
                {plan.trainingExperience ? ` · ${plan.trainingExperience}` : ''}
                {` · ${plan.trainingDaysPerWeek} days · ${plan.sessionDurationMinutes} min`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full md:max-w-md">
              <MetricButton
                icon="local_fire_department"
                label="Streak"
                value={streak > 0 ? String(streak) : '—'}
                hint={streak > 0 ? 'sessions' : 'start today'}
                active={tab === 'streak'}
                emphasize={streak >= 3}
                onClick={() => selectMetric('streak')}
              />
              <MetricButton
                icon="donut_large"
                label="Week"
                value={`${doneThisWeek}/${weekTarget}`}
                hint={`${weekPct}%`}
                active={tab === 'week'}
                emphasize={weekPct > 0}
                onClick={() => selectMetric('week')}
              />
              <MetricButton
                icon="build"
                label="Fix next"
                value={
                  nextTraining && !nextTraining.isRest
                    ? nextTraining.short.slice(0, 2)
                    : '—'
                }
                hint="coaching"
                active={tab === 'fix'}
                emphasize
                onClick={() =>
                  selectMetric('fix', nextTraining?.dateKey || selectedKey || undefined)
                }
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted mb-1.5">
              <span>Week progress</span>
              <span className="text-signal-volt tabular-nums">{weekPct}%</span>
            </div>
            <div
              className="h-2.5 bg-surface-highlight overflow-hidden cursor-pointer"
              role="progressbar"
              aria-valuenow={weekPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Week progress"
              onClick={() => selectMetric('week')}
            >
              <div
                className="h-full bg-signal-volt transition-[width] duration-700 ease-out"
                style={{ width: `${weekPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 md:p-6 space-y-5">
        {/* Responsive week strip — tap to explore */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-[11px] font-label-telemetry uppercase tracking-wider text-steel-muted inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" aria-hidden>
                touch_app
              </span>
              Tap a day
            </h3>
            <p className="text-[10px] text-steel-muted font-label-telemetry uppercase tracking-wider hidden sm:block">
              Scroll on small screens · open details below
            </p>
          </div>

          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-1 snap-x snap-mandatory">
            <ol className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[520px] sm:min-w-0" role="list">
              {journey.map((day) => (
                <li key={day.dateKey} className="snap-center">
                  <WeekDayPill
                    day={day}
                    selected={day.dateKey === selectedKey}
                    onSelect={() => selectDay(day.dateKey)}
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Interactive detail stage */}
        <div
          key={`${pulseKey}-${tab}-${selectedKey}`}
          className="plan-reveal border border-surface-highlight bg-surface-base/40 overflow-hidden"
        >
          {tab === 'streak' ? (
            <StreakPanel streak={streak} doneThisWeek={doneThisWeek} weekTarget={weekTarget} history={history} />
          ) : tab === 'fix' ? (
            <FixPanel
              day={selected || nextTraining}
              cues={
                selected
                  ? buildFixCues(selected, selectedArchive, nextTraining)
                  : nextTraining
                    ? buildFixCues(nextTraining, archiveMap[nextTraining.dateKey] || null, null)
                    : []
              }
              planMinutes={plan.sessionDurationMinutes}
            />
          ) : (
            selected && (
              <DayDetailPanel
                day={selected}
                archive={selectedArchive}
                cues={fixCues}
                todayPct={selected.isToday ? todayPct : selectedArchive?.pct || 0}
                onFixTab={() => selectMetric('fix', selected.dateKey)}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

function MetricButton({
  icon,
  label,
  value,
  hint,
  active,
  emphasize,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  active?: boolean;
  emphasize?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-2.5 sm:p-3 text-left transition-all ${
        active
          ? 'border-signal-volt bg-signal-volt/15 scale-[1.02]'
          : emphasize
            ? 'border-signal-volt/40 bg-signal-volt/5 hover:bg-signal-volt/10'
            : 'border-surface-highlight bg-surface-base/50 hover:border-steel-muted'
      }`}
      aria-pressed={active}
    >
      <div className="flex items-center gap-1 text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted">
        <span className="material-symbols-outlined text-sm text-signal-volt" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className="font-headline-md text-steel-bright text-xl sm:text-2xl mt-1 leading-none tabular-nums">{value}</p>
      <p className="text-[10px] text-steel-muted mt-1 uppercase tracking-wider font-label-telemetry truncate">{hint}</p>
    </button>
  );
}

function WeekDayPill({
  day,
  selected,
  onSelect,
}: {
  day: JourneyDay;
  selected: boolean;
  onSelect: () => void;
}) {
  const styles: Record<DayStatus, string> = {
    done: 'border-signal-volt/50 bg-signal-volt/10',
    today: 'border-signal-volt bg-signal-volt/15',
    upcoming: 'border-surface-highlight bg-surface-base/40',
    missed: 'border-destructive/40 bg-destructive/5',
    rest: 'border-surface-highlight/60 bg-surface-raised/30',
  };

  const icon =
    day.status === 'done'
      ? 'check_circle'
      : day.status === 'today'
        ? 'radio_button_checked'
        : day.status === 'missed'
          ? 'close'
          : day.isRest
            ? 'hotel'
            : 'fitness_center';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-current={day.isToday ? 'date' : undefined}
      aria-label={`${day.long}: ${day.isRest ? 'Rest' : day.focusLabel}, ${day.status}`}
      className={`relative w-full flex flex-col items-center gap-1 border px-1 py-2.5 min-h-[92px] sm:min-h-[100px] transition-all ${
        styles[day.status]
      } ${selected ? 'ring-2 ring-signal-volt scale-[1.03] z-10' : 'hover:border-signal-volt/40'} ${
        day.isRest && !selected ? 'opacity-70' : ''
      }`}
    >
      <span
        className={`text-[10px] font-label-telemetry uppercase tracking-wider ${
          day.isToday || selected ? 'text-signal-volt' : 'text-steel-muted'
        }`}
      >
        {day.short.slice(0, 2)}
      </span>
      <span
        className={`material-symbols-outlined text-xl sm:text-2xl ${
          day.status === 'done' || day.status === 'today' || selected
            ? 'text-signal-volt'
            : day.status === 'missed'
              ? 'text-destructive'
              : 'text-steel-muted'
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="text-[9px] sm:text-[10px] leading-tight text-center text-steel-muted font-label-telemetry uppercase tracking-wide px-0.5">
        {day.isRest ? 'Rest' : day.focusLabel}
      </span>
    </button>
  );
}

function DayDetailPanel({
  day,
  archive,
  cues,
  todayPct,
  onFixTab,
}: {
  day: JourneyDay;
  archive: SessionArchiveEntry | null;
  cues: FixCue[];
  todayPct: number;
  onFixTab: () => void;
}) {
  const pct = day.status === 'done' ? 100 : todayPct || archive?.pct || 0;

  return (
    <div className="grid lg:grid-cols-2 gap-0">
      <div className="relative min-h-[180px] sm:min-h-[220px] border-b lg:border-b-0 lg:border-r border-surface-highlight">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={day.focusImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover brightness-[0.55]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/50 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-5">
          <span className="text-[11px] font-label-telemetry uppercase tracking-wider text-signal-volt">
            {day.isToday ? 'Today' : day.long} · {day.status}
          </span>
          <h3 className="font-headline-md text-steel-bright uppercase text-2xl sm:text-3xl leading-none mt-1">
            {day.isRest ? 'Recover' : `Train · ${day.focusLabel}`}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-surface-highlight overflow-hidden">
                <div className="h-full bg-signal-volt transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-signal-volt font-label-telemetry tabular-nums">{pct}%</span>
            </div>
            {!day.isRest && (
              <span className="text-[11px] text-steel-muted font-label-telemetry uppercase tracking-wider">
                {day.moveCount} moves
              </span>
            )}
          </div>
          {day.status === 'today' && !day.isRest && (
            <Link href="/app/workout" className="btn custom-glow mt-4 w-fit inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                play_arrow
              </span>
              {pct > 0 && pct < 100 ? 'Continue workout' : 'Start workout'}
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {!day.isRest && (
          <div>
            <h4 className="text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted mb-2">
              Session queue
            </h4>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {day.exercises.map((ex, i) => {
                const id = String(ex.exerciseId);
                const archived = archive?.exercises.find((a) => a.exerciseId === id);
                const done = archived ? archived.setsDone >= archived.setsTotal && archived.setsTotal > 0 : false;
                const partial = archived && archived.setsDone > 0 && !done;
                return (
                  <li
                    key={`${id}-${i}`}
                    className="flex items-center gap-2 border border-surface-highlight bg-surface-raised/40 px-2.5 py-2"
                  >
                    <span
                      className={`material-symbols-outlined text-base ${
                        done ? 'text-signal-volt' : partial ? 'text-amber-400' : 'text-steel-muted'
                      }`}
                      aria-hidden
                    >
                      {done ? 'check_circle' : partial ? 'timelapse' : 'radio_button_unchecked'}
                    </span>
                    <span className="flex-1 text-sm text-steel-bright truncate">
                      {ex.exercise?.name || `Move ${i + 1}`}
                    </span>
                    <span className="text-[10px] font-label-telemetry text-steel-muted tabular-nums">
                      {archived
                        ? `${archived.setsDone}/${archived.setsTotal}`
                        : `${ex.sets}×${ex.reps}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted">
              Insight
            </h4>
            <button
              type="button"
              onClick={onFixTab}
              className="text-[10px] font-label-telemetry uppercase tracking-wider text-signal-volt hover:underline inline-flex items-center gap-1"
            >
              Fix next
              <span className="material-symbols-outlined text-sm" aria-hidden>
                arrow_forward
              </span>
            </button>
          </div>
          <ul className="space-y-2">
            {cues.slice(0, 2).map((cue) => (
              <CueCard key={cue.title} cue={cue} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FixPanel({
  day,
  cues,
  planMinutes,
}: {
  day: JourneyDay | null;
  cues: FixCue[];
  planMinutes: number;
}) {
  if (!day) {
    return (
      <div className="p-5 text-sm text-steel-muted">No upcoming training day in this week view.</div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <p className="text-[11px] font-label-telemetry uppercase tracking-wider text-signal-volt">
            What to fix next
          </p>
          <h3 className="font-headline-md text-steel-bright uppercase text-xl sm:text-2xl mt-1 leading-none">
            {day.isToday ? 'Today' : day.long} · {day.isRest ? 'Rest' : day.focusLabel}
          </h3>
          <p className="text-xs text-steel-muted mt-2">
            {day.isRest
              ? 'Use rest to prepare — then execute the next train day fully.'
              : `${day.moveCount} moves · aim ~${planMinutes} min · finish every set`}
          </p>
        </div>
        {day.status === 'today' && !day.isRest && (
          <Link href="/app/workout" className="btn custom-glow inline-flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined" aria-hidden>
              play_arrow
            </span>
            Train now
          </Link>
        )}
      </div>

      <ul className="grid sm:grid-cols-2 gap-2">
        {cues.map((cue) => (
          <li key={cue.title}>
            <CueCard cue={cue} large />
          </li>
        ))}
      </ul>

      {!day.isRest && (
        <div>
          <h4 className="text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted mb-2">
            Checklist for that day
          </h4>
          <ol className="grid sm:grid-cols-2 gap-1.5">
            {day.exercises.map((ex, i) => (
              <li
                key={`${ex.exerciseId}-${i}`}
                className="flex items-center gap-2 border border-surface-highlight px-2.5 py-2 text-sm text-steel-bright"
              >
                <span className="text-signal-volt font-label-telemetry text-[10px] tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{ex.exercise?.name || `Move ${i + 1}`}</span>
                <span className="ml-auto text-[10px] text-steel-muted font-label-telemetry">
                  {ex.sets}×{ex.reps}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function StreakPanel({
  streak,
  doneThisWeek,
  weekTarget,
  history,
}: {
  streak: number;
  doneThisWeek: number;
  weekTarget: number;
  history: SessionHistoryEntry[];
}) {
  const recent = [...history].reverse().slice(0, 5);

  return (
    <div className="p-4 sm:p-5 grid md:grid-cols-2 gap-5">
      <div className="flex flex-col items-start justify-center">
        <p className="text-[11px] font-label-telemetry uppercase tracking-wider text-signal-volt">Streak</p>
        <p className="font-display-hero text-display-hero-mobile md:text-6xl text-steel-bright leading-none mt-2 tabular-nums">
          {streak}
        </p>
        <p className="text-steel-muted mt-3 text-sm max-w-sm">
          {streak === 0
            ? 'Complete a training day to light the streak. Consistency beats intensity.'
            : streak === 1
              ? 'First spark. Protect it on the next training day.'
              : `${streak} sessions in a row. You’re building identity, not just workouts.`}
        </p>
        <p className="mt-4 text-[11px] font-label-telemetry uppercase tracking-wider text-steel-muted">
          This week {doneThisWeek}/{weekTarget}
        </p>
      </div>

      <div>
        <h4 className="text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted mb-2">
          Recent finishes
        </h4>
        {recent.length === 0 ? (
          <p className="text-sm text-steel-muted border border-dashed border-surface-highlight p-4">
            No finished sessions yet — your first completion appears here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((item, i) => (
              <li
                key={item.date}
                className="flex items-center gap-3 border border-surface-highlight bg-surface-raised/40 px-3 py-2.5 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="material-symbols-outlined text-signal-volt" aria-hidden>
                  emoji_events
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-steel-bright">{item.date}</p>
                  <p className="text-[10px] font-label-telemetry text-steel-muted uppercase tracking-wider">
                    {item.setsDone}/{item.setsTotal} sets
                  </p>
                </div>
                <span className="text-signal-volt font-headline-md text-lg tabular-nums">
                  {item.setsTotal ? Math.round((item.setsDone / item.setsTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CueCard({ cue, large }: { cue: FixCue; large?: boolean }) {
  const tone =
    cue.tone === 'good'
      ? 'border-signal-volt/40 bg-signal-volt/5'
      : cue.tone === 'fix'
        ? 'border-amber-500/35 bg-amber-500/5'
        : 'border-surface-highlight bg-surface-raised/40';

  return (
    <div className={`border p-3 ${tone} ${large ? 'h-full' : ''}`}>
      <div className="flex items-start gap-2">
        <span
          className={`material-symbols-outlined text-xl ${
            cue.tone === 'fix' ? 'text-amber-400' : 'text-signal-volt'
          }`}
          aria-hidden
        >
          {cue.icon}
        </span>
        <div>
          <p className="text-sm font-medium text-steel-bright">{cue.title}</p>
          <p className={`text-steel-muted mt-1 leading-relaxed ${large ? 'text-sm' : 'text-xs'}`}>
            {cue.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
