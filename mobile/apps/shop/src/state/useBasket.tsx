import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { effectivePrice, type Product, type ProductVariation } from '@galokids/core';

/**
 * The customer's basket.
 *
 * Kept on the device and restored on launch, because a shopper who closes the
 * app on the bus and opens it at home expects their basket to still be there —
 * losing it is the quickest way to lose the sale.
 *
 * Prices here are for display. The server prices every line from the catalogue
 * when the order is placed and ignores what the app says, so a stale price
 * shows the customer the wrong figure but cannot charge them it.
 */

const STORAGE_KEY = 'galokids.basket';

export interface BasketLine {
  key: string;
  productId: number;
  variationId: number | null;
  name: string;
  variationLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
}

interface Basket {
  lines: BasketLine[];
  itemCount: number;
  subtotal: number;
  ready: boolean;
  add: (product: Product, variation: ProductVariation | null, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const BasketContext = createContext<Basket | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved) setLines(JSON.parse(saved) as BasketLine[]);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Written on every change rather than on leaving the screen: the app can be
  // killed by the system at any moment and a half-saved basket is no basket.
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, ready]);

  const add = useCallback((product: Product, variation: ProductVariation | null, quantity = 1) => {
    const key = variation ? `v${variation.id}` : `p${product.id}`;

    setLines(previous => {
      const existing = previous.find(line => line.key === key);

      if (existing) {
        return previous.map(line =>
          line.key === key ? { ...line, quantity: line.quantity + quantity } : line
        );
      }

      return [
        ...previous,
        {
          key,
          productId: product.id,
          variationId: variation?.id ?? null,
          name: product.name_ku || product.name,
          variationLabel: [variation?.color, variation?.size].filter(Boolean).join(' · ') || null,
          imageUrl: product.image_url,
          unitPrice: effectivePrice(product, variation),
          quantity,
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines(previous =>
      quantity <= 0
        ? previous.filter(line => line.key !== key)
        : previous.map(line => (line.key === key ? { ...line, quantity } : line))
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines(previous => previous.filter(line => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Basket>(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

    return {
      lines,
      ready,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: Math.round(subtotal),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): Basket {
  const basket = useContext(BasketContext);
  if (!basket) throw new Error('useBasket must be used inside a BasketProvider');

  return basket;
}
