export const DEFAULT_API_BASE = '/API/api';

const envBase = (import.meta as any).env?.VITE_API_BASE;

function sanitizeApiUrl(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== 'string') return DEFAULT_API_BASE;

  let clean = urlStr.replace(/[^\x00-\x7F]/g, '').trim();
  clean = clean.replace(/%[a-fA-F0-9]{2}/g, (match) => {
    try {
      const decoded = decodeURIComponent(match);
      return /[^\x00-\x7F]/.test(decoded) ? '' : match;
    } catch {
      return match;
    }
  });

  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  // If environment variable is set to galo.prodental.dev direct URL, use the default proxy URL to avoid CORS
  if (!clean || clean.includes('galo.prodental.dev')) return DEFAULT_API_BASE;

  return clean;
}

export const API_BASE_URL = sanitizeApiUrl(envBase);

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const primaryUrl = `${API_BASE_URL}${cleanEndpoint}`;
  return fetch(primaryUrl, options);
}

