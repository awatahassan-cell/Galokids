// Single Centralized API Base URL for all requests across the application
const rawEnvUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE;
let parsedBaseUrl = (rawEnvUrl || '/api').replace(/\/+$/, '');

// Avoid CORS errors in browser by using local express proxy /api when a full domain is specified
if (parsedBaseUrl.startsWith('http://') || parsedBaseUrl.startsWith('https://')) {
  parsedBaseUrl = '/api';
}

export const API_BASE_URL = parsedBaseUrl;
export const REMOTE_API_BASE = API_BASE_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  return fetch(url, options);
}

