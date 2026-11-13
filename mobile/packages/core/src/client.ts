import { API_BASE_URL } from './config';

/** What went wrong, in a form a screen can act on. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Laravel's per-field validation errors, when it sent any. */
    readonly fieldErrors?: Record<string, string[]>,
    /** Its machine-readable code, e.g. "not_found". */
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the request never reached the server. */
  get isOffline(): boolean {
    return this.status === 0;
  }

  /** True when the session is gone and the app should sign the person out. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

type TokenReader = () => string | null | Promise<string | null>;
type Unauthenticated = () => void | Promise<void>;

let readToken: TokenReader = () => null;
let onUnauthenticated: Unauthenticated = () => {};
let baseUrl = API_BASE_URL;

/**
 * Tell the client where the API is and how to find the token.
 *
 * Each app stores its token differently — the till keeps a long-lived one in
 * secure storage, the shop app one per customer — so the client asks rather
 * than assuming.
 */
export function configureApi(options: {
  baseUrl?: string;
  getToken?: TokenReader;
  onUnauthenticated?: Unauthenticated;
}): void {
  if (options.baseUrl) baseUrl = options.baseUrl.replace(/\/+$/, '');
  if (options.getToken) readToken = options.getToken;
  if (options.onUnauthenticated) onUnauthenticated = options.onUnauthenticated;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Give up after this long. A till on a bad connection must not hang. */
  timeoutMs?: number;
  /** Skip the Authorization header — for /login and the public catalogue. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl}/${path.replace(/^\/+/, '')}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * One request to the API.
 *
 * A failure to reach the server is reported as status 0 rather than thrown as
 * a bare TypeError, because for the till the difference between "the server
 * said no" and "I could not ask" decides whether the sale goes in the queue or
 * in front of the cashier.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeoutMs = 15000, anonymous = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  // A file upload is sent as a form and the runtime sets its boundary; only a
  // plain object is JSON.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  if (!anonymous) {
    const token = await readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    // No reply at all: no signal, DNS, a timeout, the server down. The caller
    // needs to tell these apart from a refusal, so give them a status of 0.
    throw new ApiError(
      'ناتوانرێت پەیوەندی بە سێرڤەر بکرێت.',
      0,
      undefined,
      controller.signal.aborted ? 'timeout' : 'network'
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) await onUnauthenticated();

    const fieldErrors = payload?.errors as Record<string, string[]> | undefined;
    const firstField = fieldErrors ? Object.values(fieldErrors)[0]?.[0] : undefined;

    throw new ApiError(
      firstField || payload?.message || `هەڵەی سێرڤەر (${response.status})`,
      response.status,
      fieldErrors,
      payload?.error
    );
  }

  return payload as T;
}
