import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@galokids/core';

/**
 * Fetching something for a screen.
 *
 * Every back-office screen does the same four things — load, show a spinner,
 * show what went wrong, let the person pull to refresh — and doing it by hand
 * twenty times is how they end up subtly different.
 *
 * It refuses to set state after the screen has gone. A shopkeeper tapping
 * through sections faster than the network answers would otherwise get a
 * warning in development and, on a slow connection, the previous screen's data
 * arriving in the current one.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = []
): {
  data: T | null;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
  setData: (next: T) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const alive = useRef(true);
  const run = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: 'load' | 'refresh') => {
      const ticket = ++run.current;

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      try {
        const result = await fetcher();

        // A slower earlier request must not overwrite a faster later one.
        if (alive.current && ticket === run.current) {
          setData(result);
          setError(null);
        }
      } catch (caught) {
        if (alive.current && ticket === run.current) setError(caught);
      } finally {
        if (alive.current && ticket === run.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // The caller's dependency list is the honest signal for when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  useEffect(() => {
    load('load');
  }, [load]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => load('load'),
    refresh: () => load('refresh'),
    setData,
  };
}

/**
 * True when this screen could not reach the server.
 *
 * Decided by what actually happened to this screen's own request, and not by
 * the device's opinion of the internet. `expo-network` answers a question
 * nobody here asked — can this phone reach the public internet — and the
 * answer is routinely no in exactly the cases that matter: a shop whose till
 * talks to a server on the same LAN, a captive-portal wifi, a corporate
 * network that blocks the probe. Trusting it made every back-office screen
 * refuse to load while the API was answering perfectly well a metre away.
 *
 * A screen that reads the whole dataset has nothing useful to show from one
 * device's slice of it, so it says "needs a connection" rather than drawing an
 * empty report — which looks like a shop that sold nothing.
 */
export function useNeedsConnection(error: unknown): boolean {
  return error instanceof ApiError && error.isOffline;
}
