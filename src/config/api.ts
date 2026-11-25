// Single Centralized API Base URL for all requests across the application
const rawEnvUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE;

function getApiBaseUrl(): string {
  if (rawEnvUrl && rawEnvUrl.trim()) {
    const trimmed = rawEnvUrl.trim().replace(/\/+$/, '');
    // If running in browser on localhost / 127.0.0.1 and an absolute cross-origin URL is provided,
    // route through local /api to avoid browser CORS errors.
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return '/api';
      }
    }
    return trimmed;
  }

  // When running in the browser on localhost / 127.0.0.1, use '/api' to proxy through local server
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }

  return '/api';
}

export const API_BASE_URL = getApiBaseUrl();

export const REMOTE_API_BASE = API_BASE_URL;

/**
 * Call the API, signed in when the browser holds a token.
 *
 * The token used to be left off entirely, so every endpoint behind
 * `auth:sanctum` answered 401 — the whole contact-messages screen was dead on
 * arrival: the list never loaded, and marking read or deleting did nothing.
 *
 * `Content-Type` is deliberately not set here. Some callers post a FormData
 * (the product image upload), and the browser has to write that header itself
 * with the multipart boundary; forcing JSON would corrupt the upload. Callers
 * sending JSON set it themselves, and anything they pass wins.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (typeof options.body === 'string' && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!headers.Authorization) {
    let token: string | null = null;
    try {
      token = localStorage.getItem('kidskart_auth_token');
    } catch {
      // Private browsing can refuse storage; a public endpoint still works.
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return fetch(url, { ...options, headers });
}
