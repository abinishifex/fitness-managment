import type {
  ActivePlan,
  AuthResponse,
  Exercise,
  GeneratePlanBody,
  PlanSummary,
  Profile,
  TodayWorkout,
  UpdatePlanBody,
  WorkoutPlan,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || 'Request failed';
    const details = body?.error?.details;
    const err = new Error(message) as Error & { details?: unknown; status?: number };
    err.status = response.status;
    if (details) err.details = details;
    throw err;
  }
  return body.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: (token: string) => request<{ message: string }>('/auth/logout', { method: 'POST' }, token),
  getProfile: (token: string) => request<{ profile: Profile }>('/profile', {}, token),
  saveProfile: (token: string, profile: Profile) =>
    request<{ profile: Profile }>('/profile', { method: 'PUT', body: JSON.stringify(profile) }, token),
  generatePlan: (token: string, body: GeneratePlanBody = {}) =>
    request<{ plan: WorkoutPlan }>('/workouts/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
  listPlans: (token: string) =>
    request<{ plans: PlanSummary[]; selectedPlanId: string | null }>('/workouts/plans', {}, token),
  selectPlan: (token: string, planId: string) =>
    request<{ plan: PlanSummary }>(`/workouts/plans/${planId}/select`, { method: 'POST' }, token),
  updatePlan: (token: string, planId: string, patch: UpdatePlanBody) =>
    request<{ plan: PlanSummary }>(`/workouts/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }, token),
  regeneratePlan: (token: string, planId: string, body: GeneratePlanBody = {}) =>
    request<{ plan: PlanSummary }>(`/workouts/plans/${planId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
  deletePlan: (token: string, planId: string) =>
    request<{ deleted: boolean; planId: string }>(`/workouts/plans/${planId}`, {
      method: 'DELETE',
    }, token),
  getTodayWorkout: (token: string, planId?: string) => {
    const qs = planId ? `?planId=${encodeURIComponent(planId)}` : '';
    return request<TodayWorkout>(`/workouts/today${qs}`, {}, token);
  },
  getActivePlan: (token: string, planId?: string) => {
    const qs = planId ? `?planId=${encodeURIComponent(planId)}` : '';
    return request<ActivePlan>(`/workouts/plan${qs}`, {}, token);
  },
  listExercises: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ count: number; exercises: Exercise[] }>(`/exercises${qs ? `?${qs}` : ''}`);
  },
  getExercise: (idOrSlug: string) => request<{ exercise: Exercise }>(`/exercises/${idOrSlug}`),
};

export function getToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem('forge_token');
}
export function saveSession(auth: AuthResponse) {
  localStorage.setItem('forge_token', auth.token);
  localStorage.setItem('forge_user', JSON.stringify(auth.user));
}
export function clearSession() {
  localStorage.removeItem('forge_token');
  localStorage.removeItem('forge_user');
}
