import { api } from '../api';
import type {
  ActivePlan,
  Exercise,
  GeneratePlanBody,
  PlanSummary,
  Profile,
  TodayWorkout,
  UpdatePlanBody,
  WorkoutPlan,
} from '../types';
import {
  CACHE_KEYS,
  getCached,
  localDateString,
  planCacheKey,
  setCached,
  todayCacheKey,
} from './cache';
import { enqueue } from './queueBridge';
import { isOnline } from './useOnlineStatus';

export type CacheableProfile = { profile: Profile };
export type CacheableExercises = { count: number; exercises: Exercise[] };
export type CachedPlans = { plans: PlanSummary[]; selectedPlanId: string | null };

function notifyCacheUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('forge:cache-updated'));
  }
}

function writeSelectedPlanId(planId: string | null) {
  setCached(CACHE_KEYS.selectedPlanId, planId);
}

function writePlans(plans: PlanSummary[], selectedPlanId: string | null) {
  setCached(CACHE_KEYS.plans, { plans, selectedPlanId } satisfies CachedPlans);
  writeSelectedPlanId(selectedPlanId);
}

function mirrorSelectedToday(planId: string, today: TodayWorkout) {
  setCached(todayCacheKey(planId), today);
  setCached(CACHE_KEYS.today, today);
}

function mirrorSelectedPlan(planId: string, plan: ActivePlan) {
  setCached(planCacheKey(planId), plan);
  setCached(CACHE_KEYS.plan, plan);
}

export function peekSelectedPlanId(): string | null {
  return getCached<string | null>(CACHE_KEYS.selectedPlanId);
}

export function peekPlans(): CachedPlans | null {
  return getCached<CachedPlans>(CACHE_KEYS.plans);
}

export function peekProfile(): CacheableProfile | null {
  return getCached<CacheableProfile>(CACHE_KEYS.profile);
}

export function peekToday(planId?: string): TodayWorkout | null {
  const id = planId || peekSelectedPlanId();
  const cached = id
    ? getCached<TodayWorkout>(todayCacheKey(id)) || getCached<TodayWorkout>(CACHE_KEYS.today)
    : getCached<TodayWorkout>(CACHE_KEYS.today);
  if (!cached) return null;
  if (cached.date && cached.date !== localDateString()) return null;
  if (id && cached.planId && String(cached.planId) !== String(id)) return null;
  return cached;
}

export function peekPlan(planId?: string): ActivePlan | null {
  const id = planId || peekSelectedPlanId();
  if (id) {
    return getCached<ActivePlan>(planCacheKey(id)) || getCached<ActivePlan>(CACHE_KEYS.plan);
  }
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

function markPlansSelected(plans: PlanSummary[], planId: string): PlanSummary[] {
  return plans.map((p) => ({
    ...p,
    isActive: String(p.planId) === String(planId),
  }));
}

function applyPlanPatch(summary: PlanSummary, patch: UpdatePlanBody) {
  return {
    ...summary,
    ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
    ...(typeof patch.note === 'string' ? { note: patch.note } : {}),
    ...(typeof patch.enabled === 'boolean' ? { enabled: patch.enabled } : {}),
    ...(patch.enabled === false ? { isActive: false } : {}),
    ...(patch.fitnessGoal != null ? { fitnessGoal: patch.fitnessGoal } : {}),
    ...(patch.trainingExperience != null
      ? { trainingExperience: patch.trainingExperience }
      : {}),
    ...(patch.trainingDaysPerWeek != null
      ? { trainingDaysPerWeek: patch.trainingDaysPerWeek }
      : {}),
    ...(patch.sessionDurationMinutes != null
      ? { sessionDurationMinutes: patch.sessionDurationMinutes }
      : {}),
    ...(patch.priorityMuscleGroup != null
      ? { priorityMuscleGroup: patch.priorityMuscleGroup }
      : {}),
    ...(typeof patch.aiReason === 'string' ? { aiReason: patch.aiReason } : {}),
  };
}

async function resolvePlanId(token: string, planId?: string): Promise<string | undefined> {
  if (planId) return planId;
  const cached = peekSelectedPlanId();
  if (cached) return cached;
  try {
    const list = await offlineApi.listPlans(token);
    return list.data.selectedPlanId || list.data.plans.find((p) => p.enabled)?.planId || undefined;
  } catch {
    return undefined;
  }
}

export const offlineApi = {
  async getProfile(token: string) {
    return withCacheFirst(CACHE_KEYS.profile, () => api.getProfile(token));
  },

  async listPlans(token: string) {
    const cached = getCached<CachedPlans>(CACHE_KEYS.plans);
    if (cached) {
      writeSelectedPlanId(cached.selectedPlanId);
      if (isOnline()) {
        void api
          .listPlans(token)
          .then((fresh) => writePlans(fresh.plans, fresh.selectedPlanId))
          .catch(() => undefined);
      }
      return { data: cached, fromCache: true };
    }
    try {
      const fresh = await api.listPlans(token);
      writePlans(fresh.plans, fresh.selectedPlanId);
      return { data: fresh, fromCache: false };
    } catch (e) {
      if (cached) return { data: cached, fromCache: true };
      throw e;
    }
  },

  async getTodayWorkout(token: string, planId?: string) {
    const resolved = await resolvePlanId(token, planId);
    const key = resolved ? todayCacheKey(resolved) : CACHE_KEYS.today;
    const result = await withCacheFirst(key, () => api.getTodayWorkout(token, resolved), {
      acceptCached: (data) => {
        if (data.date && data.date !== localDateString()) return false;
        if (resolved && data.planId && String(data.planId) !== String(resolved)) return false;
        return true;
      },
    });
    if (resolved) {
      const selected = peekSelectedPlanId();
      if (!selected || String(selected) === String(resolved)) {
        setCached(CACHE_KEYS.today, result.data);
        writeSelectedPlanId(resolved);
      }
    }
    return result;
  },

  async getActivePlan(token: string, planId?: string) {
    const resolved = await resolvePlanId(token, planId);
    const key = resolved ? planCacheKey(resolved) : CACHE_KEYS.plan;
    const result = await withCacheFirst(key, () => api.getActivePlan(token, resolved));
    if (resolved) {
      const selected = peekSelectedPlanId();
      if (!selected || String(selected) === String(resolved)) {
        setCached(CACHE_KEYS.plan, result.data);
        writeSelectedPlanId(resolved);
      }
    }
    return result;
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

  async selectPlan(token: string, planId: string) {
    const cached = peekPlans();
    const plans = markPlansSelected(cached?.plans || [], planId);
    writePlans(plans, planId);

    const cachedToday = peekToday(planId);
    const cachedPlan = peekPlan(planId);
    if (cachedToday) setCached(CACHE_KEYS.today, cachedToday);
    if (cachedPlan) setCached(CACHE_KEYS.plan, cachedPlan);
    notifyCacheUpdated();

    if (!isOnline()) {
      enqueue({ type: 'selectPlan', payload: { planId } });
      return { data: { planId }, queued: true as const };
    }

    try {
      const result = await api.selectPlan(token, planId);
      const nextPlans = markPlansSelected(
        (peekPlans()?.plans || plans).map((p) =>
          String(p.planId) === String(planId) ? { ...p, ...result.plan, planId: result.plan.planId } : p,
        ),
        planId,
      );
      writePlans(nextPlans, planId);

      const [today, plan] = await Promise.all([
        api.getTodayWorkout(token, planId),
        api.getActivePlan(token, planId),
      ]);
      mirrorSelectedToday(planId, today);
      mirrorSelectedPlan(planId, plan);
      notifyCacheUpdated();
      return { data: { planId, today, plan }, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'selectPlan', payload: { planId } });
        return { data: { planId }, queued: true as const };
      }
      throw e;
    }
  },

  async updatePlan(token: string, planId: string, patch: UpdatePlanBody) {
    const cached = peekPlans();
    const plans = (cached?.plans || []).map((p) =>
      String(p.planId) === String(planId) ? applyPlanPatch(p, patch) : p,
    );
    let selectedPlanId = cached?.selectedPlanId ?? peekSelectedPlanId();

    if (patch.enabled === false && String(selectedPlanId) === String(planId)) {
      const next = plans.find((p) => p.enabled && String(p.planId) !== String(planId));
      selectedPlanId = next?.planId ?? null;
      for (const p of plans) {
        p.isActive = selectedPlanId != null && String(p.planId) === String(selectedPlanId);
      }
    }

    writePlans(plans, selectedPlanId);

    // Optimistic patch of cached ActivePlan days / aiReason when editing AI response.
    const cachedPlan = peekPlan(planId);
    if (cachedPlan && (patch.days || typeof patch.aiReason === 'string')) {
      const nextPlan: ActivePlan = {
        ...cachedPlan,
        ...(typeof patch.aiReason === 'string' ? { aiReason: patch.aiReason } : {}),
        ...(patch.days
          ? {
              days: patch.days.map((day) => {
                const prev = cachedPlan.days.find(
                  (d) => String(d.dayOfWeek) === String(day.dayOfWeek),
                );
                return {
                  dayOfWeek: day.dayOfWeek,
                  isToday: prev?.isToday,
                  exercises: day.exercises.map((ex) => {
                    const prevEx = prev?.exercises.find(
                      (e) => String(e.exerciseId) === String(ex.exerciseId),
                    );
                    return {
                      ...ex,
                      exercise: prevEx?.exercise ?? null,
                    };
                  }),
                };
              }),
            }
          : {}),
        ...(patch.fitnessGoal != null ? { fitnessGoal: patch.fitnessGoal } : {}),
        ...(patch.trainingExperience != null
          ? { trainingExperience: patch.trainingExperience }
          : {}),
        ...(patch.trainingDaysPerWeek != null
          ? { trainingDaysPerWeek: patch.trainingDaysPerWeek }
          : {}),
        ...(patch.sessionDurationMinutes != null
          ? { sessionDurationMinutes: patch.sessionDurationMinutes }
          : {}),
        ...(patch.priorityMuscleGroup != null
          ? { priorityMuscleGroup: patch.priorityMuscleGroup }
          : {}),
      };
      setCached(planCacheKey(planId), nextPlan);
      if (String(selectedPlanId) === String(planId)) {
        setCached(CACHE_KEYS.plan, nextPlan);
      }
    }

    notifyCacheUpdated();

    if (!isOnline()) {
      enqueue({ type: 'updatePlan', payload: { planId, patch } });
      return { data: { plans, selectedPlanId }, queued: true as const };
    }

    try {
      await api.updatePlan(token, planId, patch);
      const fresh = await api.listPlans(token);
      writePlans(fresh.plans, fresh.selectedPlanId);

      // Always refresh the edited plan overview (days may have changed).
      try {
        const edited = await api.getActivePlan(token, planId);
        setCached(planCacheKey(planId), edited);
        if (String(fresh.selectedPlanId) === String(planId)) {
          setCached(CACHE_KEYS.plan, edited);
        }
      } catch {
        /* plan may be deactivated / empty */
      }

      if (fresh.selectedPlanId) {
        const [today, plan] = await Promise.all([
          api.getTodayWorkout(token, fresh.selectedPlanId),
          api.getActivePlan(token, fresh.selectedPlanId),
        ]);
        mirrorSelectedToday(fresh.selectedPlanId, today);
        mirrorSelectedPlan(fresh.selectedPlanId, plan);
      }
      notifyCacheUpdated();
      return { data: fresh, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'updatePlan', payload: { planId, patch } });
        return { data: { plans, selectedPlanId }, queued: true as const };
      }
      throw e;
    }
  },

  async regeneratePlan(token: string, planId: string, body: GeneratePlanBody = {}) {
    if (!isOnline()) {
      enqueue({ type: 'regeneratePlan', payload: { planId, body } });
      return { data: null as PlanSummary | null, queued: true as const };
    }
    try {
      const result = await api.regeneratePlan(token, planId, body);
      const list = await api.listPlans(token);
      writePlans(list.plans, list.selectedPlanId);
      if (list.selectedPlanId) {
        try {
          const [today, plan] = await Promise.all([
            api.getTodayWorkout(token, list.selectedPlanId),
            api.getActivePlan(token, list.selectedPlanId),
          ]);
          mirrorSelectedToday(list.selectedPlanId, today);
          mirrorSelectedPlan(list.selectedPlanId, plan);
        } catch {
          /* today may 404 on rest/empty */
        }
      }
      notifyCacheUpdated();
      return { data: result.plan, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'regeneratePlan', payload: { planId, body } });
        return { data: null as PlanSummary | null, queued: true as const };
      }
      throw e;
    }
  },

  async deletePlan(token: string, planId: string) {
    const cached = peekPlans();
    const remaining = (cached?.plans || []).filter((p) => String(p.planId) !== String(planId));
    let selectedPlanId = cached?.selectedPlanId ?? peekSelectedPlanId();
    if (String(selectedPlanId) === String(planId)) {
      selectedPlanId = remaining.find((p) => p.enabled)?.planId ?? null;
    }
    const plans = markPlansSelected(remaining, selectedPlanId || '');
    writePlans(plans, selectedPlanId);
    notifyCacheUpdated();

    if (!isOnline()) {
      enqueue({ type: 'deletePlan', payload: { planId } });
      return { data: { plans, selectedPlanId }, queued: true as const };
    }

    try {
      await api.deletePlan(token, planId);
      const fresh = await api.listPlans(token);
      writePlans(fresh.plans, fresh.selectedPlanId);
      if (fresh.selectedPlanId) {
        const [today, plan] = await Promise.all([
          api.getTodayWorkout(token, fresh.selectedPlanId),
          api.getActivePlan(token, fresh.selectedPlanId),
        ]);
        mirrorSelectedToday(fresh.selectedPlanId, today);
        mirrorSelectedPlan(fresh.selectedPlanId, plan);
      }
      notifyCacheUpdated();
      return { data: fresh, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'deletePlan', payload: { planId } });
        return { data: { plans, selectedPlanId }, queued: true as const };
      }
      throw e;
    }
  },

  async generatePlan(token: string, body: GeneratePlanBody = {}) {
    if (!isOnline()) {
      enqueue({ type: 'generatePlan', payload: body });
      return { data: null as WorkoutPlan | null, queued: true as const };
    }
    try {
      const result = await api.generatePlan(token, body);
      const planId = result.plan._id;
      const overview: ActivePlan = {
        planId,
        name: result.plan.name,
        note: result.plan.note,
        splitType: result.plan.splitType,
        fitnessGoal: result.plan.fitnessGoal ?? null,
        trainingExperience: result.plan.trainingExperience ?? null,
        priorityMuscleGroup: result.plan.priorityMuscleGroup || '',
        trainingDaysPerWeek: result.plan.trainingDaysPerWeek,
        sessionDurationMinutes: result.plan.sessionDurationMinutes,
        aiReason: result.plan.aiReason ?? null,
        enabled: result.plan.enabled !== false,
        isActive: Boolean(result.plan.isActive),
        todayDayOfWeek: '',
        days: result.plan.days,
      };
      setCached(planCacheKey(planId), overview);

      const list = await api.listPlans(token);
      writePlans(list.plans, list.selectedPlanId);

      if (result.plan.isActive || list.selectedPlanId === planId) {
        writeSelectedPlanId(planId);
        setCached(CACHE_KEYS.plan, overview);
        try {
          const today = await api.getTodayWorkout(token, planId);
          mirrorSelectedToday(planId, today);
        } catch {
          /* today may 404 on rest/empty */
        }
      }
      notifyCacheUpdated();
      return { data: result.plan, queued: false as const };
    } catch (e) {
      if (!isOnline() || isNetworkError(e)) {
        enqueue({ type: 'generatePlan', payload: body });
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
      api.listPlans(token).then(async (d) => {
        writePlans(d.plans, d.selectedPlanId);
        const selected = d.selectedPlanId;
        if (selected) {
          const [today, plan] = await Promise.all([
            api.getTodayWorkout(token, selected),
            api.getActivePlan(token, selected),
          ]);
          mirrorSelectedToday(selected, today);
          mirrorSelectedPlan(selected, plan);
        }
        return d;
      }),
      api.listExercises({ limit: '100' }).then((d) => {
        setCached(CACHE_KEYS.exercises, d);
        return d;
      }),
    ]);
  },
};
