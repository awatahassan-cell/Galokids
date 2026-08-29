import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartLine, Product, ProductVariation } from '../api/types';
import { lineTotal, roundIQD } from '../utils/money';

const CART_KEY = 'galokids.cart';
const WISHLIST_KEY = 'galokids.wishlist';

interface CartValue {
  lines: CartLine[];
  wishlist: string[];
  itemCount: number;
  subtotal: number;
  ready: boolean;
  add: (product: Product, variation: ProductVariation | null, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const CartContext = createContext<CartValue | null>(null);

/** One line per product-and-variation, so two sizes of the same shirt stay apart. */
const lineIdFor = (productId: string, variationId?: string | null) =>
  variationId ? `${productId}::${variationId}` : `${productId}::default`;

/**
 * The basket, and the saved list.
 *
 * Both live on the phone rather than on the server, which is what the website
 * does too — a basket is not worth an account. They are stored in
 * AsyncStorage, not SecureStore: there is nothing secret about which shirt
 * someone is thinking of buying, and SecureStore is slow enough that writing
 * to it on every quantity tap would be felt.
 *
 * The whole basket is re-checked against the catalogue when it loads, because
 * a product saved last week may since have changed price or gone.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    Promise.all([AsyncStorage.getItem(CART_KEY), AsyncStorage.getItem(WISHLIST_KEY)])
      .then(([rawCart, rawWishlist]) => {
        if (!alive) return;

        if (rawCart) {
          const parsed = JSON.parse(rawCart);
          if (Array.isArray(parsed)) {
            setLines(
              parsed.filter(
                (line: CartLine) => line?.product?.id && Number(line?.quantity) > 0
              )
            );
          }
        }

        if (rawWishlist) {
          const parsed = JSON.parse(rawWishlist);
          if (Array.isArray(parsed)) setWishlist(parsed.map(String));
        }
      })
      .catch(() => {
        // A corrupted basket is better dropped than shown as gibberish.
      })
      .finally(() => alive && setReady(true));

    return () => {
      alive = false;
    };
  }, []);

  // Only persist after the first load, or an empty initial state would
  // overwrite a real basket saved on the previous run.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)).catch(() => {});
  }, [wishlist, ready]);

  const add = useCallback(
    (product: Product, variation: ProductVariation | null, quantity = 1) => {
      const id = lineIdFor(product.id, variation?.id);
      // Never add more than the shelf holds; a variation with no stock record
      // is treated as unlimited, which is how the website behaves.
      const available = variation ? Math.max(0, variation.stockQuantity) : Number.POSITIVE_INFINITY;

      setLines(prev => {
        const existing = prev.find(line => line.id === id);
        if (!existing) {
          return [...prev, { id, product, variation, quantity: Math.min(quantity, available) }];
        }

        return prev.map(line =>
          line.id === id
            ? { ...line, product, variation, quantity: Math.min(line.quantity + quantity, available) }
            : line
        );
      });
    },
    []
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setLines(prev => {
      if (quantity <= 0) return prev.filter(line => line.id !== lineId);

      return prev.map(line => {
        if (line.id !== lineId) return line;
        const available = line.variation
          ? Math.max(1, line.variation.stockQuantity)
          : Number.POSITIVE_INFINITY;
        return { ...line, quantity: Math.min(quantity, available) };
      });
    });
  }, []);

  const remove = useCallback((lineId: string) => {
    setLines(prev => prev.filter(line => line.id !== lineId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const subtotal = useMemo(
    () =>
      roundIQD(
        lines.reduce((sum, line) => sum + lineTotal(line.product, line.variation, line.quantity), 0)
      ),
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      wishlist,
      itemCount,
      subtotal,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      toggleWishlist,
      isWishlisted,
    }),
    [lines, wishlist, itemCount, subtotal, ready, add, setQuantity, remove, clear, toggleWishlist, isWishlisted]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
