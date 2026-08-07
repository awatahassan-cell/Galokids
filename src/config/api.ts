export const REMOTE_API_BASE = 'https://galo.prodental.dev/API/api';
export const DEFAULT_API_BASE = '/API/api';

const envBase = (import.meta as any).env?.VITE_API_BASE;

function sanitizeApiUrl(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== 'string') return DEFAULT_API_BASE;

  let clean = urlStr.replace(/[^\x00-\x7F]/g, '').trim();
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  // If an absolute HTTP/HTTPS URL is provided, map it to the proxy route /API/api
  // because direct browser fetches to external domains fail due to CORS restrictions.
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return DEFAULT_API_BASE;
  }

  return clean || DEFAULT_API_BASE;
}

export const API_BASE_URL = sanitizeApiUrl(envBase);

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const primaryUrl = `${API_BASE_URL}${cleanEndpoint}`;
  
  try {
    const res = await fetch(primaryUrl, options);
    if (res.ok || res.status === 401 || res.status === 422 || res.status === 400 || res.status === 404) {
      return res;
    }
  } catch (err) {
    console.warn(`Primary API fetch (${primaryUrl}) failed, trying direct fallback to remote API (${REMOTE_API_BASE})...`, err);
  }

  // Fallback to direct remote API URL
  const fallbackUrl = `${REMOTE_API_BASE}${cleanEndpoint}`;
  return fetch(fallbackUrl, options);
}
