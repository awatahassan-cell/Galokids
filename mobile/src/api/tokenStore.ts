import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'galokids.session.token';

/**
 * Where the customer's session token lives.
 *
 * SecureStore, not AsyncStorage: AsyncStorage is an unencrypted file in the
 * app's sandbox, readable from a backup or from any process that gets at the
 * filesystem on a rooted or jailbroken phone. SecureStore hands it to the
 * iOS Keychain and to Android's Keystore-backed encrypted preferences.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the token out of iCloud Keychain and
 * off the customer's other devices — a session belongs to the phone it was
 * created on, and a token restored onto a second device from a backup is a
 * session nobody signed in for.
 *
 * The value is cached in memory because SecureStore touches the Keychain on
 * every read, which is slow enough to be felt when it happens on every
 * request in a list that is paging.
 */
let cached: string | null | undefined;

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) return cached;

  try {
    cached = await SecureStore.getItemAsync(TOKEN_KEY, OPTIONS);
  } catch {
    // A device with no secure hardware, or a corrupted entry. Treat it as
    // signed out rather than crashing the app on launch.
    cached = null;
  }

  return cached;
}

export async function setToken(token: string): Promise<void> {
  cached = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token, OPTIONS);
  } catch {
    // The session still works for as long as the app is open; it just will
    // not survive a restart.
  }
}

export async function clearToken(): Promise<void> {
  cached = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY, OPTIONS);
  } catch {
    // Nothing to do — the in-memory copy is already gone.
  }
}
