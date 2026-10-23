/**
 * Pure HTTP client — no session helpers, no offline imports.
 * Imported by offlineApi.ts and queue.ts to break the circular dependency
 * that existed when both imported from api.ts (which can re-enter the offline
 * module graph via app pages).
 */
import type {
  ActivePlan,
  AdminMember,
  AdminOverview,
  AuthResponse,
  BillingPlan,
  Exercise,
  GeneratePlanBody,
  Invoice,
  Membership,
  MembershipStatus,
  Payment,
  PlanSummary,
  Profile,
  TelegramLinkStatus,
  TodayWorkout,
  UpdatePlanBody,
  WorkoutPlan,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  // Let the browser set multipart boundary when body is FormData
  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
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
  listBillingPlans: () => request<{ plans: BillingPlan[] }>('/plans'),
  register: (input: { email: string; password: string; phone: string; planId: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
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

  // Billing — member
  getMembershipStatus: (token: string) =>
    request<MembershipStatus>('/memberships/me/status', {}, token),
  getMyMemberships: (token: string) =>
    request<{ memberships: Membership[] }>('/memberships/me', {}, token),
  getMembershipInvoices: (token: string, membershipId: string) =>
    request<{ invoices: Invoice[] }>(`/memberships/${membershipId}/invoices`, {}, token),
  submitTransfer: (
    token: string,
    input: { invoiceId: string; file: File; idempotencyKey?: string }
  ) => {
    const form = new FormData();
    form.append('invoiceId', input.invoiceId);
    form.append('screenshot', input.file);
    if (input.idempotencyKey) form.append('idempotencyKey', input.idempotencyKey);
    return request<{ payment: Payment; alreadyRecorded: boolean }>(
      '/payments/transfer',
      { method: 'POST', body: form },
      token
    );
  },
  getTelegramStatus: (token: string) =>
    request<TelegramLinkStatus>('/telegram/status', {}, token),
  createTelegramLinkCode: (token: string) =>
    request<{
      code: string;
      expiresAt: string;
      linked: boolean;
      instructions: string;
      botUsername?: string | null;
      deepLink?: string | null;
    }>('/telegram/link-code', { method: 'POST' }, token),

  // Billing — admin
  getAdminOverview: (token: string) =>
    request<AdminOverview>('/admin/overview', {}, token),
  listAdminMembers: (token: string, params: { q?: string; limit?: number; skip?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.skip != null) qs.set('skip', String(params.skip));
    const q = qs.toString();
    return request<{ members: AdminMember[]; total: number; limit: number; skip: number }>(
      `/admin/members${q ? `?${q}` : ''}`,
      {},
      token
    );
  },
  getAdminMember: (token: string, id: string) =>
    request<{
      member: AdminMember;
      membership: Membership | null;
      plan: BillingPlan | null;
      invoices: Invoice[];
    }>(`/admin/members/${id}`, {}, token),
  createAdminMember: (
    token: string,
    input: { email: string; password: string; phone: string; planId: string }
  ) =>
    request<{
      user: AdminMember;
      membership: Membership;
      invoice: Invoice;
      plan: BillingPlan;
    }>('/admin/members', { method: 'POST', body: JSON.stringify(input) }, token),
  patchAdminMember: (token: string, id: string, input: { isActive: boolean }) =>
    request<{ member: AdminMember }>(
      `/admin/members/${id}`,
      { method: 'PATCH', body: JSON.stringify(input) },
      token
    ),
  listAdminInvoices: (
    token: string,
    params: { status?: string; userId?: string; limit?: number; skip?: number } = {}
  ) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.userId) qs.set('userId', params.userId);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.skip != null) qs.set('skip', String(params.skip));
    const q = qs.toString();
    return request<{ invoices: Invoice[]; total: number }>('/invoices' + (q ? `?${q}` : ''), {}, token);
  },
  recordCash: (
    token: string,
    input: { membershipId: string; amount?: number; idempotencyKey?: string }
  ) =>
    request<{
      payment: Payment;
      invoice: Invoice | null;
      membership: Membership | null;
      alreadyRecorded: boolean;
    }>('/payments/cash', { method: 'POST', body: JSON.stringify(input) }, token),
  listPendingPayments: (token: string, params: { limit?: number; skip?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.skip != null) qs.set('skip', String(params.skip));
    const q = qs.toString();
    return request<{ payments: Payment[]; total: number }>(
      `/payments/pending${q ? `?${q}` : ''}`,
      {},
      token
    );
  },
  approvePayment: (token: string, paymentId: string) =>
    request<{ payment: Payment; alreadyApproved: boolean }>(
      `/payments/${paymentId}/approve`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    ),
  rejectPayment: (token: string, paymentId: string, reason?: string) =>
    request<{ payment: Payment; alreadyRejected: boolean }>(
      `/payments/${paymentId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token
    ),
};
