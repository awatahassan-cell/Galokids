import { shifts, type Shift } from '@galokids/core';
import { useFetch } from '@/state/useFetch';

/**
 * Whether this cashier has a shift open.
 *
 * Three answers, not two. `open` and `closed` are what the server said;
 * `unknown` is that it could not be asked — the till is offline, which is
 * exactly when the shop still has to be able to sell. Treating "could not
 * tell" as "no shift" would lock a cashier out of the till every time the
 * wifi dropped, so only a definite "closed" blocks a sale.
 */
export function useShift() {
  const query = useFetch(() => shifts.current(), []);

  const shift: Shift | null =
    query.data && 'id' in query.data && query.data.status === 'open' ? (query.data as Shift) : null;

  const state: 'open' | 'closed' | 'unknown' = shift
    ? 'open'
    : query.loading && !query.data
      ? 'unknown'
      : query.error
        ? 'unknown'
        : 'closed';

  return { shift, state, reload: query.reload, refresh: query.refresh };
}
