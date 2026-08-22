import Constants from 'expo-constants';
import { getToken, clearToken } from './tokenStore';

/**
 * Where the shop's API lives.
 *
 * Read from `expo.extra` so a build can be pointed at staging without a code
 * change, and forced to HTTPS: a plain-http base would send the customer's
 * session token and address over the air in the clear, and on both platforms
 * the app is configured to refuse cleartext anyway — better to fail loudly
 * here than to make requests that die inside the networking stack.
 */
function resolveBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl ??
    'https://galo.prodental.dev/API/api';

  const trimmed = configured.trim().replace(/\/+$/, '');

  if (__DEV__ && /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.)/.test(trimmed)) {
    // A local backend over http is the one case worth allowing, and only
    // while developing.
    return trimmed;
  }

  if (!trimmed.startsWith('https://')) {
    throw new Error('API base URL must use https://');
  }

  return trimmed;
}

export const API_BASE_URL = resolveBaseUrl();

export const WEB_BASE_URL = (
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.webUrl ?? 'https://galokids.com'
)
  .trim()
  .replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone or was never valid; the caller should sign out. */
  get isAuthError() {
    return this.status === 401 || this.status === 419;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Attach the stored session token. Off by default: most reads are public. */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Give up after this long. Without it a dead network hangs the screen. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${clean}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

/**
 * One way in and out of the API.
 *
 * Every call goes through here so that timeouts, the session token, and the
 * handling of an expired session are decided once rather than remembered in
 * thirty screens.
 */
export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = false, query, timeoutMs = 15000, headers, signal, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // A caller's own cancellation (a screen unmounting, a search superseded)
  // has to reach the same controller as the timeout.
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      // A rejected token is dead weight: drop it so the app stops sending it
      // and the account screen shows a signed-out state rather than looping.
      if (response.status === 401 || response.status === 419) {
        await clearToken();
      }

      const message =
        (payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : null) ?? `Request failed (${response.status})`;

      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError('Request timed out', 0);
    }
    throw new ApiError('Network request failed', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
