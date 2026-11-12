/**
 * Where a session token lives, in a browser.
 *
 * `expo-secure-store` is native-only: calling it on the web throws
 * `getValueWithKeyAsync is not a function`, which was happening on every page
 * of the web build. There is no browser equivalent of a keystore, so this uses
 * localStorage — the same place the existing React panel keeps its token.
 *
 * That is a real difference in what the two builds promise, and worth being
 * plain about: anything that can run script on the page can read this. It is
 * the ordinary web trade, it is what the site already did, and it is a reason
 * to keep the panel on a domain that serves nothing else.
 *
 * Every access is wrapped: a private window, cleared site data or a blocked
 * third-party context can make localStorage throw rather than return null.
 */

export async function getSecret(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage refused. The session lives in memory until the tab closes.
  }
}

export async function deleteSecret(key: string): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Already gone, or storage refused.
  }
}
