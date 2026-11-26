import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { catalogue, effectivePrice, type Product, type ProductVariation } from '@galokids/core';

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
  /**
   * How many the shop had when this was last checked, or null when the product
   * has no sizes and so no count. The basket never holds more than this.
   */
  stock?: number | null;
}

interface Basket {
  lines: BasketLine[];
  itemCount: number;
  subtotal: number;
  ready: boolean;
  /** Units actually added: fewer than asked, or none, when the shop does not have that many. */
  add: (product: Product, variation: ProductVariation | null, quantity?: number) => number;
  /** Check every line against the shop as it is now; says what it had to drop or trim. */
  refresh: () => Promise<{ removed: number; trimmed: number }>;
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

  // Read synchronously as well as through state, so two adds in the same tick
  // each see the other.
  const linesRef = useRef<BasketLine[]>(lines);
  linesRef.current = lines;
  const commit = useCallback((next: BasketLine[]) => {
    linesRef.current = next;
    setLines(next);
  }, []);

  const add = useCallback((product: Product, variation: ProductVariation | null, quantity = 1): number => {
    const key = variation ? `v${variation.id}` : `p${product.id}`;
    // A product with sizes has a count; one without has none to enforce.
    const stock = variation ? Math.max(0, variation.stock_quantity) : null;
    const existing = linesRef.current.find(line => line.key === key);
    const room = stock === null ? quantity : stock - (existing?.quantity ?? 0);
    const added = Math.max(0, Math.min(quantity, room));

    if (added <= 0) return 0;

    commit(
      existing
        ? linesRef.current.map(line =>
            line.key === key ? { ...line, quantity: line.quantity + added, stock } : line
          )
        : [
            ...linesRef.current,
            {
              key,
              productId: product.id,
              variationId: variation?.id ?? null,
              name: product.name_ku || product.name,
              variationLabel: [variation?.color, variation?.size].filter(Boolean).join(' · ') || null,
              imageUrl: product.image_url,
              unitPrice: effectivePrice(product, variation),
              quantity: added,
              stock,
            },
          ]
    );

    return added;
  }, [commit]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    commit(
      quantity <= 0
        ? linesRef.current.filter(line => line.key !== key)
        : linesRef.current.map(line => {
            if (line.key !== key) return line;
            // Never more than the shop has.
            const limit = line.stock == null ? quantity : Math.max(1, line.stock);
            return { ...line, quantity: Math.min(quantity, limit) };
          })
    );
  }, [commit]);

  /**
   * Check the basket against the shop as it is now.
   *
   * The basket is kept on the phone and can be days old, so a line can outlive
   * the stock it was added against. Each product is re-read: a size that is
   * gone is dropped, a quantity above what is left is trimmed, and the rest
   * pick up the current price. If the shop cannot be reached nothing changes —
   * no signal is not a reason to empty someone's basket.
   */
  const refresh = useCallback(async () => {
    const ids = [...new Set(linesRef.current.map(line => line.productId))];
    const fresh = new Map<number, Product | 'gone' | 'unknown'>();

    await Promise.all(
      ids.map(async id => {
        try {
          fresh.set(id, await catalogue.product(id));
        } catch (error) {
          fresh.set(id, (error as { status?: number }).status === 404 ? 'gone' : 'unknown');
        }
      })
    );

    let removed = 0;
    let trimmed = 0;
    let changed = false;
    const next: BasketLine[] = [];

    for (const line of linesRef.current) {
      const product = fresh.get(line.productId);
      if (!product || product === 'unknown') { next.push(line); continue; }
      if (product === 'gone') { removed++; changed = true; continue; }

      if (line.variationId == null) {
        next.push({ ...line, unitPrice: effectivePrice(product, null) });
        continue;
      }

      const variation = product.variations.find(v => v.id === line.variationId);
      const stock = Math.max(0, variation?.stock_quantity ?? 0);
      if (!variation || stock <= 0) { removed++; changed = true; continue; }

      const quantity = Math.min(line.quantity, stock);
      if (quantity < line.quantity) trimmed++;
      changed = true;
      next.push({ ...line, quantity, stock, unitPrice: effectivePrice(product, variation) });
    }

    if (changed) commit(next);
    return { removed, trimmed };
  }, [commit]);

  const remove = useCallback((key: string) => {
    commit(linesRef.current.filter(line => line.key !== key));
  }, [commit]);

  const clear = useCallback(() => commit([]), [commit]);

  const value = useMemo<Basket>(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

    return {
      lines,
      ready,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: Math.round(subtotal),
      add,
      refresh,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, refresh, setQuantity, remove, clear]);

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): Basket {
  const basket = useContext(BasketContext);
  if (!basket) throw new Error('useBasket must be used inside a BasketProvider');

  return basket;
}
