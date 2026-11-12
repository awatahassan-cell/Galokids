import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { effectivePrice, type Product } from '@galokids/core';

/**
 * The things a shopper has saved for later.
 *
 * Kept on the device, like the basket. There is no server endpoint for a
 * wishlist, and inventing one would mean a shopper has to have an account
 * before they can save anything — which is backwards: saving things is often
 * what happens before somebody decides to buy at all.
 *
 * The cost is that the list does not follow them to another phone, and it is
 * worth being plain about that on the screen rather than letting them find out.
 *
 * A snapshot of each product is stored alongside its id so the list draws
 * instantly and still draws with no signal. The screen refreshes those from
 * the catalogue when it can, because a saved price that has since changed is
 * the one thing a shopper will hold the shop to.
 */

const STORAGE_KEY = 'galokids.wishlist';

export interface WishlistEntry {
  productId: number;
  name: string;
  imageUrl: string | null;
  price: number;
  savedAt: string;
}

interface Wishlist {
  entries: WishlistEntry[];
  ready: boolean;
  count: number;
  has: (productId: number) => boolean;
  toggle: (product: Product) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const WishlistContext = createContext<Wishlist | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (!saved) return;

        const parsed = JSON.parse(saved) as WishlistEntry[];
        // Guard the shape: an old or half-written value should cost the
        // shopper their saved list, not crash the app on launch.
        if (Array.isArray(parsed)) {
          setEntries(parsed.filter(entry => typeof entry?.productId === 'number'));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }, [entries, ready]);

  const has = useCallback(
    (productId: number) => entries.some(entry => entry.productId === productId),
    [entries]
  );

  const toggle = useCallback((product: Product) => {
    setEntries(previous => {
      if (previous.some(entry => entry.productId === product.id)) {
        return previous.filter(entry => entry.productId !== product.id);
      }

      return [
        {
          productId: product.id,
          name: product.name_ku || product.name,
          imageUrl: product.image_url,
          price: effectivePrice(product),
          savedAt: new Date().toISOString(),
        },
        ...previous,
      ];
    });
  }, []);

  const remove = useCallback((productId: number) => {
    setEntries(previous => previous.filter(entry => entry.productId !== productId));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo<Wishlist>(
    () => ({ entries, ready, count: entries.length, has, toggle, remove, clear }),
    [entries, ready, has, toggle, remove, clear]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): Wishlist {
  const wishlist = useContext(WishlistContext);
  if (!wishlist) throw new Error('useWishlist must be used inside a WishlistProvider');

  return wishlist;
}
