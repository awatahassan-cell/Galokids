import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { lastSyncedAt, outboxCounts, sync, type SyncResult } from '@/offline';

/**
 * Whether the till is in touch with the shop, and what it still owes.
 *
 * The number of unsent sales is the one thing the cashier must always be able
 * to see. A till that has been quietly failing to sync for three days looks
 * exactly like one that is working, right up until someone asks why the day's
 * takings are wrong — so the count sits on screen rather than in a settings
 * page nobody opens.
 */

interface SyncState {
  online: boolean;
  syncing: boolean;
  pending: number;
  rejected: number;
  lastSynced: Date | null;
  lastResult: SyncResult | null;
  /** Sync now. Safe to call at any time; it refuses to run twice at once. */
  syncNow: (options?: { pullCatalogue?: boolean }) => Promise<SyncResult>;
  refreshCounts: () => Promise<void>;
}

const SyncContext = createContext<SyncState | null>(null);

/** How often to try, when there is something waiting. */
const RETRY_INTERVAL_MS = 60_000;

export function SyncProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const inFlight = useRef(false);

  const refreshCounts = useCallback(async () => {
    const counts = await outboxCounts();
    setPending(counts.pending);
    setRejected(counts.rejected);
    setLastSynced(await lastSyncedAt());
  }, []);

  const syncNow = useCallback(
    async (options: { pullCatalogue?: boolean } = {}) => {
      if (inFlight.current) {
        return { pushed: 0, rejected: 0, pulled: 0, stillPending: pending, problem: 'busy' };
      }

      inFlight.current = true;
      setSyncing(true);

      try {
        const result = await sync(options);
        setLastResult(result);

        // The authority on whether the shop is reachable: a sync that got
        // through, or one that could not ask.
        if (result.problem !== 'busy') setOnline(result.problem !== 'offline');

        await refreshCounts();

        return result;
      } finally {
        inFlight.current = false;
        setSyncing(false);
      }
    },
    [pending, refreshCounts]
  );

  // The device's own opinion, used for one thing only: noticing the moment a
  // phone regains signal, so the queue goes out without waiting for the timer.
  //
  // It is NOT allowed to decide that the till is offline. `expo-network`
  // answers a different question — can this device reach the public internet —
  // and the answer is routinely no in the cases that matter most: a till
  // talking to a server on the same LAN, a captive-portal wifi, a network that
  // blocks the probe. Whether the shop is reachable is settled by a request to
  // the shop either working or not, which is what `sync()` reports back.
  useEffect(() => {
    if (!enabled) return;

    const subscription = Network.addNetworkStateListener?.(state => {
      if (state.isInternetReachable) syncNow();
    });

    return () => subscription?.remove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Try again on a timer while anything is waiting, and whenever the till
  // comes back to the foreground — which is when a cashier has just picked it
  // up and is about to care.
  useEffect(() => {
    if (!enabled) return;

    syncNow();

    const timer = setInterval(() => {
      if (pending > 0 || online) syncNow();
    }, RETRY_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') syncNow();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
    // syncNow is stable enough for this; re-running on every pending change
    // would restart the timer constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (enabled) refreshCounts();
  }, [enabled, refreshCounts]);

  const value = useMemo<SyncState>(
    () => ({ online, syncing, pending, rejected, lastSynced, lastResult, syncNow, refreshCounts }),
    [online, syncing, pending, rejected, lastSynced, lastResult, syncNow, refreshCounts]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncState {
  const state = useContext(SyncContext);
  if (!state) throw new Error('useSync must be used inside a SyncProvider');

  return state;
}
