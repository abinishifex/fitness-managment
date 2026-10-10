export const CACHE_KEYS = {
  profile: 'forge_cache:profile',
  today: 'forge_cache:today',
  plan: 'forge_cache:plan',
  exercises: 'forge_cache:exercises',
  plans: 'forge_cache:plans',
  selectedPlanId: 'forge_cache:selectedPlanId',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

type CacheEntry<T> = {
  data: T;
  updatedAt: string;
};

function canUseStorage() {
  return typeof window !== 'undefined';
}

export function getCached<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function getCachedEntry<T>(key: string): CacheEntry<T> | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T) {
  if (!canUseStorage()) return;
  const entry: CacheEntry<T> = { data, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(entry));
}

export function removeCached(key: string) {
  if (!canUseStorage()) return;
  localStorage.removeItem(key);
}

export function todayCacheKey(planId: string) {
  return `${CACHE_KEYS.today}:${planId}`;
}

export function planCacheKey(planId: string) {
  return `${CACHE_KEYS.plan}:${planId}`;
}

export function clearOfflineCache() {
  if (!canUseStorage()) return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('forge_cache:')) toRemove.push(key);
  }
  for (const key of toRemove) localStorage.removeItem(key);
}

/** Local calendar date YYYY-MM-DD */
export function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
