import { useCallback, useEffect, useState } from 'react';
import { getSecret, setSecret } from '@galokids/core';
import type { CartSnapshot } from '@/state/useCart';

const KEY = 'galokids.pos.held';

export interface HeldSale extends CartSnapshot {
  id: string;
  at: string;
}

/**
 * Sales put aside while the customer goes back for a different size.
 *
 * Kept on the device, not the server: a held sale is not a sale yet, it moves
 * no stock and no money, and it has to survive the app being closed. It is
 * stored with the same small key-value store the session uses, which exists on
 * the phone and in the browser alike.
 */
export function useHeld() {
  const [held, setHeld] = useState<HeldSale[]>([]);

  useEffect(() => {
    getSecret(KEY)
      .then(raw => raw && setHeld(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const persist = useCallback((next: HeldSale[]) => {
    setHeld(next);
    setSecret(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const hold = useCallback(
    (snapshot: CartSnapshot) =>
      persist([{ ...snapshot, id: `held_${Date.now()}`, at: new Date().toISOString() }, ...held]),
    [held, persist]
  );

  const take = useCallback(
    (id: string): HeldSale | undefined => {
      const found = held.find(entry => entry.id === id);
      if (found) persist(held.filter(entry => entry.id !== id));
      return found;
    },
    [held, persist]
  );

  const discard = useCallback((id: string) => persist(held.filter(entry => entry.id !== id)), [held, persist]);

  return { held, hold, take, discard };
}
