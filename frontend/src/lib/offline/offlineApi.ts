import { api } from '../api';
import type { ActivePlan, Exercise, Profile, TodayWorkout, WorkoutPlan } from '../types';
import { CACHE_KEYS, getCached, localDateString, setCached } from './cache';
import { enqueue } from './queueBridge';
import { isOnline } from './useOnlineStatus';

export type CacheableProfile = { profile: Profile };
export type CacheableExercises = { count: number; exercises: Exercise[] };

export function peekProfile(): CacheableProfile | null {
  return getCached<CacheableProfile>(CACHE_KEYS.profile);
}

export function peekToday(): TodayWorkout | null {
  const cached = getCached<TodayWorkout>(CACHE_KEYS.today);
  if (!cached) return null;
  if (cached.date && cached.date !== localDateString()) return null;
  return cached;
}

export function peekPlan(): ActivePlan | null {
  return getCached<ActivePlan>(CACHE_KEYS.plan);
}

export function peekExercises(): CacheableExercises | null {
  return getCached<CacheableExercises>(CACHE_KEYS.exercises);
}

function isNetworkError(e: unknown) {
  return e instanceof TypeError && /fetch|network|failed/i.test(e.message);
}

async function withCacheFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { acceptCached?: (data: T) => boolean },
): Promise<{ data: T; fromCache: boolean }> {
  const cached = getCached<T>(key);
  const usable = Boolean(cached && (!options?.acceptCached || options.acceptCached(cached)));

  if (usable && cached) {
    if (isOnline()) {
      void fetcher()
        .then((fresh) => setCached(key, fresh))
        .catch(() => undefined);
    }
    return { data: cached, fromCache: true };
  }

  try {
    const fresh = await fetcher();
    setCached(key, fresh);
    return { data: fresh, fromCache: false };
  } catch (e) {
    if (cached) return { data: cached, fromCache: true };
    throw e;
  }
}

export const offlineApi = {
  async getProfile(token: string) {
    return withCacheFirst(CACHE_KEYS.profile, () => api.getProfile(token));
  },

  async getTodayWorkout(token: string) {
    return withCacheFirst(CACHE_KEYS.today, () => api.getTodayWorkout(token), {
      acceptCached: (data) => !data.date || data.date === localDateString(),
    });
  },

  async getActivePlan(token: string) {
    return withCacheFirst(CACHE_KEYS.plan, () => api.getActivePlan(token));
  },

  async listExercises(params: Record<string, string> = {}) {
    const isDefault = !params.type && (params.limit === '100' || !params.limit);
    if (!isDefault) {
      const fresh = await api.listExercises(params);
      return { data: fresh, fromCache: false };
    }
    return withCacheFirst(CACHE_KEYS.exercises, () => api.listExercises({ limit: '100' }));
  },

  async saveProfile(token: string, profile: Profile) {
    const payload = { profile };
    if (!isOnline()) {
      setCached(CACHE_KEYS.profile, payload);
      enqueue({ type: 'saveProfile', payload: profile });
      return { data: payload, queued: true as const };
    }
    try {
      const result = await api.saveProfile(token, profile);
      setCached(CACHE_KEYS.profile, result);
      return { data: result, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        setCached(CACHE_KEYS.profile, payload);
        enqueue({ type: 'saveProfile', payload: profile });
        return { data: payload, queued: true as const };
      }
      throw e;
    }
  },

  async generatePlan(token: string) {
    if (!isOnline()) {
      enqueue({ type: 'generatePlan' });
      return { data: null as WorkoutPlan | null, queued: true as const };
    }
    try {
      const result = await api.generatePlan(token);
      setCached(CACHE_KEYS.plan, {
        planId: result.plan._id,
        splitType: result.plan.splitType,
        trainingDaysPerWeek: result.plan.trainingDaysPerWeek,
        sessionDurationMinutes: result.plan.sessionDurationMinutes,
        aiReason: result.plan.aiReason ?? null,
        todayDayOfWeek: '',
        days: result.plan.days,
      } satisfies ActivePlan);
      return { data: result.plan, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'generatePlan' });
        return { data: null as WorkoutPlan | null, queued: true as const };
      }
      throw e;
    }
  },

  async revalidateAll(token: string) {
    return Promise.allSettled([
      api.getProfile(token).then((d) => {
        setCached(CACHE_KEYS.profile, d);
        return d;
      }),
      api.getTodayWorkout(token).then((d) => {
        setCached(CACHE_KEYS.today, d);
        return d;
      }),
      api.getActivePlan(token).then((d) => {
        setCached(CACHE_KEYS.plan, d);
        return d;
      }),
      api.listExercises({ limit: '100' }).then((d) => {
        setCached(CACHE_KEYS.exercises, d);
        return d;
      }),
    ]);
  },
};
