/**
 * Public API surface for app consumers.
 * The `api` object lives in apiClient.ts to keep it free of circular imports
 * (offline/ modules import apiClient directly; this file re-exports it so
 * existing consumers don't need to change their import path).
 */
export { api } from './apiClient';
import type { AuthResponse } from './types';

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
