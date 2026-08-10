// Single Centralized API Base URL for all requests across the application
const rawEnvUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE;
const defaultBackendUrl = 'https://galo.prodental.dev/API/api';

export const API_BASE_URL = (rawEnvUrl && rawEnvUrl.trim())
  ? rawEnvUrl.trim().replace(/\/+$/, '')
  : defaultBackendUrl;

export const REMOTE_API_BASE = API_BASE_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  return fetch(url, options);
}
