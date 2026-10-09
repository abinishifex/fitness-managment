import type { GeneratePlanBody, Profile, UpdatePlanBody } from '../types';
import { api, getToken } from '../api';
import {
  CACHE_KEYS,
  planCacheKey,
  setCached,
  todayCacheKey,
} from './cache';

const QUEUE_KEY = 'forge_mutation_queue';

export type QueuedMutation =
  | { id: string; type: 'saveProfile'; payload: Profile; createdAt: string }
  | {
      id: string;
      type: 'generatePlan';
      payload?: GeneratePlanBody;
      createdAt: string;
    }
  | { id: string; type: 'selectPlan'; payload: { planId: string }; createdAt: string }
  | {
      id: string;
      type: 'updatePlan';
      payload: { planId: string; patch: UpdatePlanBody };
      createdAt: string;
    }
  | {
      id: string;
      type: 'regeneratePlan';
      payload: { planId: string; body?: GeneratePlanBody };
      createdAt: string;
    }
  | { id: string; type: 'deletePlan'; payload: { planId: string }; createdAt: string };

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function listQueue(): QueuedMutation[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedMutation[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

type EnqueueInput =
  | { type: 'saveProfile'; payload: Profile; createdAt?: string }
  | {
      type: 'generatePlan';
      payload?: GeneratePlanBody;
      createdAt?: string;
    }
  | { type: 'selectPlan'; payload: { planId: string }; createdAt?: string }
  | {
      type: 'updatePlan';
      payload: { planId: string; patch: UpdatePlanBody };
      createdAt?: string;
    }
  | {
      type: 'regeneratePlan';
      payload: { planId: string; body?: GeneratePlanBody };
      createdAt?: string;
    }
  | { type: 'deletePlan'; payload: { planId: string }; createdAt?: string };

export function enqueue(mutation: EnqueueInput): QueuedMutation {
  const item = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: mutation.createdAt || new Date().toISOString(),
  } as QueuedMutation;
  const next = [...listQueue(), item];
  saveQueue(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('forge:queue-changed'));
  }
  return item;
}

export function removeFromQueue(id: string) {
  saveQueue(listQueue().filter((m) => m.id !== id));
}

export function clearQueue() {
  if (!canUseStorage()) return;
  localStorage.removeItem(QUEUE_KEY);
}

export function pendingCount() {
  return listQueue().length;
}

export type FlushResult = {
  flushed: number;
  failed: number;
  authError: boolean;
};

/**
 * Process queued mutations FIFO. Stops on auth failure so the UI can redirect.
 */
export async function flushQueue(): Promise<FlushResult> {
  const token = getToken();
  if (!token) {
    return { flushed: 0, failed: listQueue().length, authError: listQueue().length > 0 };
  }

  let flushed = 0;
  let failed = 0;
  let authError = false;
  const remaining = [...listQueue()];

  for (const item of remaining) {
    try {
      if (item.type === 'saveProfile') {
        const result = await api.saveProfile(token, item.payload);
        setCached(CACHE_KEYS.profile, { profile: result.profile });
      } else if (item.type === 'generatePlan') {
        const result = await api.generatePlan(token, item.payload || {});
        const planId = result.plan._id;
        const overview = {
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
        if (result.plan.isActive) {
          setCached(CACHE_KEYS.selectedPlanId, planId);
          setCached(CACHE_KEYS.plan, overview);
        }
        const list = await api.listPlans(token);
        setCached(CACHE_KEYS.plans, list);
        setCached(CACHE_KEYS.selectedPlanId, list.selectedPlanId);
      } else if (item.type === 'selectPlan') {
        await api.selectPlan(token, item.payload.planId);
        setCached(CACHE_KEYS.selectedPlanId, item.payload.planId);
        const [today, plan, list] = await Promise.all([
          api.getTodayWorkout(token, item.payload.planId),
          api.getActivePlan(token, item.payload.planId),
          api.listPlans(token),
        ]);
        setCached(todayCacheKey(item.payload.planId), today);
        setCached(CACHE_KEYS.today, today);
        setCached(planCacheKey(item.payload.planId), plan);
        setCached(CACHE_KEYS.plan, plan);
        setCached(CACHE_KEYS.plans, list);
      } else if (item.type === 'updatePlan') {
        await api.updatePlan(token, item.payload.planId, item.payload.patch);
        const list = await api.listPlans(token);
        setCached(CACHE_KEYS.plans, list);
        setCached(CACHE_KEYS.selectedPlanId, list.selectedPlanId);
        try {
          const edited = await api.getActivePlan(token, item.payload.planId);
          setCached(planCacheKey(item.payload.planId), edited);
          if (String(list.selectedPlanId) === String(item.payload.planId)) {
            setCached(CACHE_KEYS.plan, edited);
          }
        } catch {
          /* edited plan may be unavailable */
        }
      } else if (item.type === 'regeneratePlan') {
        await api.regeneratePlan(token, item.payload.planId, item.payload.body || {});
        const list = await api.listPlans(token);
        setCached(CACHE_KEYS.plans, list);
        setCached(CACHE_KEYS.selectedPlanId, list.selectedPlanId);
        if (list.selectedPlanId) {
          try {
            const [today, plan] = await Promise.all([
              api.getTodayWorkout(token, list.selectedPlanId),
              api.getActivePlan(token, list.selectedPlanId),
            ]);
            setCached(todayCacheKey(list.selectedPlanId), today);
            setCached(CACHE_KEYS.today, today);
            setCached(planCacheKey(list.selectedPlanId), plan);
            setCached(CACHE_KEYS.plan, plan);
          } catch {
            /* today may 404 on rest/empty */
          }
        }
      } else if (item.type === 'deletePlan') {
        await api.deletePlan(token, item.payload.planId);
        const list = await api.listPlans(token);
        setCached(CACHE_KEYS.plans, list);
        setCached(CACHE_KEYS.selectedPlanId, list.selectedPlanId);
      }
      removeFromQueue(item.id);
      flushed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (/unauthorized|401|token|sign in|auth/i.test(message)) {
        authError = true;
        failed += listQueue().length;
        break;
      }
      failed += 1;
      // Leave item in queue for retry; stop to preserve FIFO order for dependent ops
      break;
    }
  }

  return { flushed, failed, authError };
}
