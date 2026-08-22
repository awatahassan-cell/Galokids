import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { clearToken, getToken, setToken } from '../api/tokenStore';
import {
  fetchCurrentUser,
  requestOtp,
  signInWithPhone,
  signOut as signOutRequest,
  updateProfile,
  verifyOtp,
} from '../api/endpoints';
import type { User } from '../api/types';
import { normalizePhone } from '../utils/phone';

interface AuthValue {
  user: User | null;
  /** True until the stored session has been checked, so screens can wait. */
  loading: boolean;
  isSignedIn: boolean;
  sendCode: (phone: string) => Promise<void>;
  /** Verify the code and sign in. `name` is used only for a new account. */
  confirmCode: (phone: string, code: string, name?: string) => Promise<User>;
  updateMe: (input: { name?: string; email?: string; address?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Who is signed in.
 *
 * Sign-in is by phone number and a one-time code — the same flow as the
 * website, and the only one the app offers. There is no password field
 * anywhere in it, so there is no password for the app to hold or leak.
 *
 * The stored token is verified against the server on launch rather than
 * trusted. A token can be revoked, the account can be deleted, or the phone
 * can have been restored from an old backup; asking who it belongs to is one
 * request and it is the difference between a real session and a stale name
 * on a profile screen.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const me = await fetchCurrentUser();
        if (alive) setUser(me);
      } catch (error) {
        // An invalid token is already cleared by the client; anything else
        // (a flat network on launch) simply leaves the app signed out for now.
        if (!(error instanceof ApiError && error.isAuthError)) {
          await clearToken();
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const sendCode = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new ApiError('invalid-phone', 422);
    await requestOtp(normalized);
  }, []);

  const confirmCode = useCallback(async (phone: string, code: string, name?: string) => {
    const normalized = normalizePhone(phone);
    if (!normalized) throw new ApiError('invalid-phone', 422);

    // Two steps on purpose: the code proves the number, and the short-lived
    // token that proves it is then exchanged for a session. The code itself
    // never becomes a credential.
    const verificationToken = await verifyOtp(normalized, code);
    const { token, user: signedIn } = await signInWithPhone({
      phone: normalized,
      verificationToken,
      name,
    });

    await setToken(token);
    setUser(signedIn);
    return signedIn;
  }, []);

  const updateMe = useCallback(async (input: { name?: string; email?: string; address?: string }) => {
    const updated = await updateProfile(input);
    setUser(updated);
  }, []);

  const signOut = useCallback(async () => {
    // Drop the local session first. If the round trip fails, the customer is
    // still signed out on this phone, which is what they asked for.
    setUser(null);
    await clearToken();
    await signOutRequest();
  }, []);

  const value = useMemo(
    () => ({ user, loading, isSignedIn: user !== null, sendCode, confirmCode, updateMe, signOut }),
    [user, loading, sendCode, confirmCode, updateMe, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
