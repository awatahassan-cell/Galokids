// Single Centralized API Base URL for all requests across the application
const rawEnvUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE;
const defaultBackendUrl = '/api';

function getApiBaseUrl(): string {
  if (rawEnvUrl && rawEnvUrl.trim()) {
    const trimmed = rawEnvUrl.trim().replace(/\/+$/, '');
    // If rawEnvUrl is an absolute cross-origin URL (like galo.prodental.dev), proxy via local /api
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return defaultBackendUrl;
    }
    return trimmed;
  }
  return defaultBackendUrl;
}

export const API_BASE_URL = getApiBaseUrl();

export const REMOTE_API_BASE = API_BASE_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  return fetch(url, options);
}


