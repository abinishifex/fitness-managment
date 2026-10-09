import type { Profile } from '../types';
import { api, getToken } from '../api';
import { CACHE_KEYS, setCached } from './cache';

const QUEUE_KEY = 'forge_mutation_queue';

export type QueuedMutation =
  | { id: string; type: 'saveProfile'; payload: Profile; createdAt: string }
  | { id: string; type: 'generatePlan'; createdAt: string };

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
  | { type: 'generatePlan'; createdAt?: string };

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
        const result = await api.generatePlan(token);
        setCached(CACHE_KEYS.plan, {
          planId: result.plan._id,
          splitType: result.plan.splitType,
          trainingDaysPerWeek: result.plan.trainingDaysPerWeek,
          sessionDurationMinutes: result.plan.sessionDurationMinutes,
          aiReason: result.plan.aiReason ?? null,
          todayDayOfWeek: '',
          days: result.plan.days,
        });
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
