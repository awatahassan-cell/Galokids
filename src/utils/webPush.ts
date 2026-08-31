import { API_BASE_URL } from '../config/api';

/**
 * Signing this browser up for the shop's push notifications.
 *
 * Different from `notifications.ts`, which raises an alert from a page that is
 * already open. This registers a service worker with the browser's own push
 * service, so the shop is told about an order with the panel closed — or with
 * the laptop shut and only a phone to hand.
 */

export type PushState =
  | 'unsupported'   // the browser has no push, or the page is not on https
  | 'disabled'      // the server has no VAPID keys configured
  | 'denied'        // the person said no; only they can undo it
  | 'off'           // available, not subscribed
  | 'on';           // subscribed and ready

const SW_PATH = '/sw.js';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('kidskart_auth_token');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Push needs a secure context. `localhost` counts as one, so development
 * works, but a site served over plain http never will — worth reporting as
 * "unsupported" rather than letting a subscribe call fail mysteriously.
 */
export function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.isSecureContext
  );
}

/** The VAPID public key arrives base64url; the browser wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function serverConfig(): Promise<{ enabled: boolean; publicKey: string | null }> {
  try {
    const res = await fetch(`${API_BASE_URL}/push/config`, { headers: authHeaders() });
    if (!res.ok) return { enabled: false, publicKey: null };
    const data = await res.json();
    return { enabled: Boolean(data?.enabled), publicKey: data?.public_key ?? null };
  } catch {
    return { enabled: false, publicKey: null };
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

/** What state this browser is in, without asking for anything. */
export async function getState(): Promise<PushState> {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';

  const { enabled } = await serverConfig();
  if (!enabled) return 'disabled';

  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

/**
 * Ask permission, subscribe, and register the subscription with the shop.
 *
 * Returns the state it ended in, so the caller can say what happened rather
 * than guessing.
 */
export async function enable(): Promise<PushState> {
  if (!isSupported()) return 'unsupported';

  const { enabled, publicKey } = await serverConfig();
  if (!enabled || !publicKey) return 'disabled';

  // The browser only grants this from a real click, which is why this is
  // never called on page load.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await registration();
  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();

  // A subscription made against a previous VAPID key cannot receive anything,
  // and re-subscribing over it silently fails — drop it first.
  if (subscription) {
    const current = new Uint8Array(subscription.options.applicationServerKey ?? new ArrayBuffer(0));
    const wanted = urlBase64ToUint8Array(publicKey);
    const sameKey =
      current.length === wanted.length && current.every((byte, i) => byte === wanted[i]);

    if (!sameKey) {
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      // Required by every browser: only this server's messages are accepted.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();

  const res = await fetch(`${API_BASE_URL}/push/subscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      // Older Chrome negotiates the legacy scheme; the server has to encrypt
      // the way this browser expects.
      content_encoding:
        (PushManager as any).supportedContentEncodings?.includes('aes128gcm')
          ? 'aes128gcm'
          : 'aesgcm',
    }),
  });

  if (!res.ok) {
    // Do not leave a browser subscribed to a server that does not know it: it
    // would look enabled and never ring.
    await subscription.unsubscribe().catch(() => {});
    return 'off';
  }

  return 'on';
}

export async function disable(): Promise<PushState> {
  if (!isSupported()) return 'unsupported';

  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await reg?.pushManager.getSubscription();

    if (subscription) {
      // Tell the server first: if the browser drops it and the request then
      // fails, the shop keeps pushing to an address nobody reads.
      await fetch(`${API_BASE_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});

      await subscription.unsubscribe();
    }
  } catch {
    // Already gone.
  }

  return 'off';
}

/** Ask the server to push one notification back, to prove the path works. */
export async function sendTest(): Promise<{ ok: boolean; message: string }> {
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await reg?.pushManager.getSubscription();

    if (!subscription) return { ok: false, message: 'ئەم وێبگەڕە تۆمار نەکراوە.' };

    const res = await fetch(`${API_BASE_URL}/push/test`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, message: data?.message ?? '' };
  } catch {
    return { ok: false, message: 'ناتوانرێت پەیوەندی بە سێرڤەرەوە بکرێت.' };
  }
}
