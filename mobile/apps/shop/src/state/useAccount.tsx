import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  auth,
  configureApi,
  deleteSecret,
  getSecret,
  setSecret,
  normalizePhone,
  type User,
} from '@galokids/core';
import { apiBaseUrl } from '@/apiConfig';

/**
 * The customer's account.
 *
 * Signing in is a code to the phone, not a password — the same two-legged flow
 * the website uses, and for the same reason. The code alone is not enough: the
 * server hands back a single-use token after verifying it, and that token, not
 * the phone number, is what opens a session. Without it anyone could ask to be
 * signed in as any number.
 *
 * Browsing needs no account at all. The app only asks at checkout, because a
 * sign-up wall is the fastest way to lose a shopper who was only looking.
 */

interface Account {
  user: User | null;
  loading: boolean;
  /** Ask for a code. */
  requestCode: (phone: string) => Promise<void>;
  /** Check the code and open a session. */
  confirmCode: (phone: string, code: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureApi({
      baseUrl: apiBaseUrl,
      getToken: async () => getSecret(AUTH_TOKEN_KEY),
      // A shopper's session going stale is not an emergency: drop it and let
      // them carry on browsing, which needs no account.
      onUnauthenticated: async () => {
        await deleteSecret(AUTH_TOKEN_KEY).catch(() => {});
        await deleteSecret(AUTH_USER_KEY).catch(() => {});
        setUser(null);
      },
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await getSecret(AUTH_USER_KEY);
        if (saved) setUser(JSON.parse(saved) as User);
      } catch {
        // Nothing saved, or storage refused. Browsing works regardless.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestCode = useCallback(async (phone: string) => {
    const canonical = normalizePhone(phone);
    if (!canonical) throw new Error('ژمارەی مۆبایلەکە دروست نییە.');

    const result = await auth.sendOtp(canonical);
    if (!result.success) throw new Error(result.message);
  }, []);

  const confirmCode = useCallback(async (phone: string, code: string, name?: string) => {
    const canonical = normalizePhone(phone);
    if (!canonical) throw new Error('ژمارەی مۆبایلەکە دروست نییە.');

    const checked = await auth.verifyOtp(canonical, code);

    // The token is the whole point. Without one the server will refuse to open
    // a session, so there is nothing to be gained by carrying on.
    if (!checked.verification_token) {
      throw new Error(checked.message || 'کۆدەکە دروست نییە.');
    }

    const session = await auth.loginWithPhone(canonical, checked.verification_token, name);

    await setSecret(AUTH_TOKEN_KEY, session.access_token);
    await setSecret(AUTH_USER_KEY, JSON.stringify(session.user));

    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout().catch(() => {});
    await deleteSecret(AUTH_TOKEN_KEY);
    await deleteSecret(AUTH_USER_KEY);

    setUser(null);
  }, []);

  const value = useMemo<Account>(
    () => ({ user, loading, requestCode, confirmCode, signOut }),
    [user, loading, requestCode, confirmCode, signOut]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be used inside an AccountProvider');

  return account;
}
