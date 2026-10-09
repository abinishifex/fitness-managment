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

const KEY = 'forge_session_log';

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
