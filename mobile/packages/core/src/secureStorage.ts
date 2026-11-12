import * as SecureStore from 'expo-secure-store';

/**
 * Where a session token lives.
 *
 * On a phone that is the device's keystore — the till sits on a counter all
 * day and the token is a standing key to the shop's orders, stock and
 * takings, so it should not be readable by anything that gets a look at the
 * filesystem.
 *
 * The web build has its own version of this file (`secureStorage.web.ts`),
 * because SecureStore is native-only: calling it in a browser throws, which
 * is what was happening on every page of the web build.
 */

export async function getSecret(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // A device with no keystore, or storage refused. Signed out rather than
    // crashed: the person can sign in again.
    return null;
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Nothing to be done here that the caller could act on. The session lives
    // in memory for as long as the app is open.
  }
}

export async function deleteSecret(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Already gone, or storage refused. Either way it is not there.
  }
}
