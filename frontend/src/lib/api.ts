import type { ActivePlan, AuthResponse, Exercise, Profile, TodayWorkout, WorkoutPlan } from './types';

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
  if (!response.ok) throw new Error(body?.error?.message || body?.message || 'Request failed');
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
  generatePlan: (token: string) =>
    request<{ plan: WorkoutPlan }>('/workouts/generate', { method: 'POST' }, token),
  getTodayWorkout: (token: string) => request<TodayWorkout>('/workouts/today', {}, token),
  getActivePlan: (token: string) => request<ActivePlan>('/workouts/plan', {}, token),
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
