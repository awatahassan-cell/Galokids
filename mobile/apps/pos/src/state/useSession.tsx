import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  API_BASE_URL,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  auth,
  configureApi,
  hasPermission,
  isPrivileged,
  type User,
} from '@galokids/core';

/**
 * Who is signed in to this till.
 *
 * The token lives in the device's secure storage rather than plain storage: a
 * till sits on a counter all day and the token is a standing key to the shop's
 * orders, stock and takings.
 *
 * It is deliberately NOT cleared when a request comes back 401. A cashier
 * mid-sale with a queue of unsent orders must not be thrown to a login screen
 * because the server hiccuped; the sync treats 401 as "try later" and the
 * person signs in again when they choose.
 */

interface Session {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: string) => boolean;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tell the API client where to find the token. Done once, before anything
  // can make a request.
  useEffect(() => {
    configureApi({
      baseUrl: API_BASE_URL,
      getToken: async () => SecureStore.getItemAsync(AUTH_TOKEN_KEY),
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [saved, savedUser] = await Promise.all([
          SecureStore.getItemAsync(AUTH_TOKEN_KEY),
          SecureStore.getItemAsync(AUTH_USER_KEY),
        ]);

        if (saved) setToken(saved);
        if (savedUser) setUser(JSON.parse(savedUser) as User);

        // Refresh the account in the background. If the shop changed what this
        // cashier may do, the till should find out — but a failure here must
        // not sign anyone out, because it is usually just no signal.
        if (saved) {
          auth
            .me()
            .then(async fresh => {
              setUser(fresh);
              await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(fresh));
            })
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    const result = await auth.login(login, password);

    if (!isPrivileged(result.user)) {
      throw new Error('ئەم هەژمارە ڕێگەی پێنادرێت بچێتە ناو سیستەمی فرۆشتن.');
    }

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.access_token);
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(result.user));

    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    // Tell the server if we can, but go either way: a cashier handing the till
    // over should not be stuck signed in because the connection is down.
    await auth.logout().catch(() => {});
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(AUTH_USER_KEY);

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<Session>(
    () => ({
      user,
      token,
      loading,
      signIn,
      signOut,
      // Hiding a button is a courtesy. The server decides, and refuses.
      can: (permission: string) => hasPermission(user, permission),
    }),
    [user, token, loading, signIn, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside a SessionProvider');

  return session;
}
