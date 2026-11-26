// Single Centralized API Base URL for all requests across the application
const rawEnvUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE;

/** The live shop's API. */
const PRODUCTION_API = 'https://galo.prodental.dev/API/api';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Where the API is.
 *
 * - On a developer's machine the live API is reached through the local
 *   server's `/api` proxy, because calling it straight from `localhost` is a
 *   cross-origin request the browser blocks. That only applies to the live
 *   address (or to nothing configured): a developer who deliberately points
 *   the app at some other backend — a local Laravel, say — gets exactly that.
 * - Anywhere else a configured address is used as given, and with nothing
 *   configured it is the live API, as it always was. A relative `/api` would
 *   only work behind `server.ts`; a build uploaded to a plain static host
 *   would send every request to a path that does not exist there.
 */
function getApiBaseUrl(): string {
  const configured = (rawEnvUrl && String(rawEnvUrl).trim()) ? String(rawEnvUrl).trim().replace(/\/+$/, '') : '';

  if (isLocalhost) {
    return !configured || configured === PRODUCTION_API || configured === '/API/api' ? '/api' : configured;
  }

  // On production, the backend is mounted at /API/api (with capital /API).
  // If configured was /api, map it to /API/api so requests hit the live Laravel routes instead of the SPA HTML fallback.
  if (!configured || configured === '/api') {
    return '/API/api';
  }

  return configured || PRODUCTION_API;
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
