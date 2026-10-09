export type SetLog = {
  weightKg: string;
  reps: string;
  completed: boolean;
  completedAt?: string;
};

export type ExerciseSessionLog = {
  exerciseId: string;
  sets: SetLog[];
};

export type SessionLog = {
  planId: string;
  date: string;
  startedAt: string;
  exercises: ExerciseSessionLog[];
  completedAt?: string;
};

export type SessionHistoryEntry = {
  date: string;
  planId: string;
  completedAt: string;
  setsDone: number;
  setsTotal: number;
};

export type ArchivedExercise = {
  exerciseId: string;
  setsDone: number;
  setsTotal: number;
  lastWeightKg?: string;
  lastReps?: string;
};

export type SessionArchiveEntry = {
  date: string;
  planId: string;
  updatedAt: string;
  completedAt?: string;
  setsDone: number;
  setsTotal: number;
  pct: number;
  exercises: ArchivedExercise[];
};

const KEY = 'forge_session_log';
const HISTORY_KEY = 'forge_session_history';
const ARCHIVE_KEY = 'forge_session_archive';

export function loadSessionLog(planId: string, date: string): SessionLog | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionLog;
    if (parsed.planId === planId && parsed.date === date) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSessionLog(log: SessionLog) {
  localStorage.setItem(KEY, JSON.stringify(log));
  archiveSessionSnapshot(log);
  if (log.completedAt) {
    const { done, total } = sessionProgress(log);
    recordSessionCompletion({
      date: log.date,
      planId: log.planId,
      completedAt: log.completedAt,
      setsDone: done,
      setsTotal: total,
    });
  }
}

function snapshotFromLog(log: SessionLog): SessionArchiveEntry {
  const { done, total, pct } = sessionProgress(log);
  return {
    date: log.date,
    planId: log.planId,
    updatedAt: new Date().toISOString(),
    completedAt: log.completedAt,
    setsDone: done,
    setsTotal: total,
    pct,
    exercises: log.exercises.map((ex) => {
      const completedSets = ex.sets.filter((s) => s.completed);
      const last = completedSets[completedSets.length - 1];
      return {
        exerciseId: String(ex.exerciseId),
        setsDone: completedSets.length,
        setsTotal: ex.sets.length,
        lastWeightKg: last?.weightKg || undefined,
        lastReps: last?.reps || undefined,
      };
    }),
  };
}

export function archiveSessionSnapshot(log: SessionLog) {
  if (typeof window === 'undefined') return;
  const snapshot = snapshotFromLog(log);
  const archive = loadSessionArchive().filter((item) => item.date !== snapshot.date);
  archive.push(snapshot);
  archive.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive.slice(-60)));
}

export function loadSessionArchive(): SessionArchiveEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionArchiveEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getArchivedSession(date: string): SessionArchiveEntry | null {
  return loadSessionArchive().find((item) => item.date === date) || null;
}

export function createSessionLog(
  planId: string,
  date: string,
  exercises: { exerciseId: string; sets: number }[]
): SessionLog {
  return {
    planId,
    date,
    startedAt: new Date().toISOString(),
    exercises: exercises.map((ex) => ({
      exerciseId: String(ex.exerciseId),
      sets: Array.from({ length: ex.sets }, () => ({
        weightKg: '',
        reps: '',
        completed: false,
      })),
    })),
  };
}

export function sessionProgress(log: SessionLog) {
  const total = log.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const done = log.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function loadSessionHistory(): SessionHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordSessionCompletion(entry: SessionHistoryEntry) {
  if (typeof window === 'undefined') return;
  const history = loadSessionHistory().filter((item) => item.date !== entry.date);
  history.push(entry);
  history.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-60)));
}

/** EAT (UTC+3) calendar helpers — matches server weekday resolution */
export function getEatNow(date = new Date()) {
  return new Date(date.getTime() + 3 * 60 * 60 * 1000);
}

export function eatDateKey(date = new Date()) {
  return getEatNow(date).toISOString().slice(0, 10);
}

export function eatWeekdayName(date = new Date()) {
  return getEatNow(date).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
  });
}

export function addDaysKey(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function weekdayLongFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
  });
}

export function weekdayShortFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
  });
}

/** Monday-start week containing the given EAT date key */
export function weekDateKeys(aroundKey = eatDateKey()): string[] {
  const day = new Date(`${aroundKey}T12:00:00.000Z`);
  const utcDay = day.getUTCDay(); // 0 Sun … 6 Sat
  const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = addDaysKey(aroundKey, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
}

export function completedDatesSet(history = loadSessionHistory()) {
  return new Set(history.filter((h) => h.setsDone > 0 || h.completedAt).map((h) => h.date));
}

/**
 * Streak of consecutive completed training days.
 * Rest days are skipped. An incomplete today does not break the streak.
 */
export function computeTrainingStreak(
  isTrainingWeekday: (weekdayLong: string) => boolean,
  history = loadSessionHistory()
): number {
  const completed = completedDatesSet(history);
  let streak = 0;
  let counting = false;

  for (let i = 0; i < 90; i++) {
    const key = addDaysKey(eatDateKey(), -i);
    const weekday = weekdayLongFromKey(key);
    if (!isTrainingWeekday(weekday)) continue;

    const done = completed.has(key);
    if (!counting) {
      if (i === 0 && !done) continue;
      counting = true;
    }
    if (!done) break;
    streak += 1;
  }

  return streak;
}
