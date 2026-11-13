import { useCallback, useEffect, useMemo, useState } from 'react';
import { LocalProduct, LocalVariation, findByBarcode } from '@/offline';
import { effectivePrice } from '@galokids/core';

/**
 * The basket on the counter.
 *
 * Prices are worked out here and sent as nothing at all: the server prices
 * every line from the catalogue itself and ignores what a client claims, so
 * these numbers exist to show the cashier and print the receipt, not to decide
 * what the customer pays. A till that has been offline for a day and has a
 * stale price will therefore charge what is on the shelf, and the server will
 * record what it believes — a difference the shop can see rather than one it
 * has to discover.
 */

export interface CartLine {
  /** Stable within this sale, so the same product in two sizes stays two lines. */
  key: string;
  product: LocalProduct;
  variation: LocalVariation | null;
  quantity: number;
  unitPrice: number;
  /**
   * A line with no catalogue product behind it — the till's "quick add".
   *
   * Sent to the server as a name and a price rather than a product id, and
   * kept out of local stock because there is none to take it from.
   */
  custom?: { name: string };
}

/** What the cashier types for a discount: a flat sum, or a share of the subtotal. */
export interface DiscountSpec {
  mode: 'amount' | 'percent';
  value: number;
}

export interface Customer {
  name: string;
  phone: string;
}

/** Everything a half-rung sale is, so it can be put aside and picked up again. */
export interface CartSnapshot {
  lines: CartLine[];
  discount: DiscountSpec;
  customer: Customer;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
}

function lineKey(product: LocalProduct, variation: LocalVariation | null): string {
  return variation ? `v${variation.id}` : `p${product.id}`;
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<DiscountSpec>({ mode: 'amount', value: 0 });
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '' });

  const add = useCallback((product: LocalProduct, variation: LocalVariation | null, quantity = 1) => {
    const key = lineKey(product, variation);

    setLines(previous => {
      const existing = previous.find(line => line.key === key);

      // Scanning the same garment twice means two of it, not a second line.
      if (existing) {
        return previous.map(line =>
          line.key === key ? { ...line, quantity: line.quantity + quantity } : line
        );
      }

      return [
        ...previous,
        {
          key,
          product,
          variation,
          quantity,
          unitPrice: effectivePrice(
            { price: product.price, discount_price: product.discount_price },
            variation
          ),
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

  const clear = useCallback(() => {
    setLines([]);
    setDiscount({ mode: 'amount', value: 0 });
    setCustomer({ name: '', phone: '' });
  }, []);

  /** A line the catalogue does not know — priced by the cashier. */
  const addCustom = useCallback((name: string, unitPrice: number, quantity = 1) => {
    const stub: LocalProduct = {
      id: 0,
      name,
      name_ku: null,
      name_ar: null,
      price: unitPrice,
      discount_price: null,
      cost: null,
      sku: null,
      image_url: null,
      category_id: null,
      is_active: 1,
      updated_at: '',
    };

    setLines(previous => [
      ...previous,
      { key: `c${Date.now()}${previous.length}`, product: stub, variation: null, quantity, unitPrice, custom: { name } },
    ]);
  }, []);

  const snapshot = useCallback((): CartSnapshot => ({ lines, discount, customer }), [lines, discount, customer]);

  const restore = useCallback((saved: CartSnapshot) => {
    setLines(saved.lines);
    setDiscount(saved.discount);
    setCustomer(saved.customer);
  }, []);

  /** Scan a code and put what it found in the basket. */
  const scan = useCallback(
    async (code: string): Promise<{ ok: true; line: CartLine } | { ok: false; reason: 'unknown' | 'pick-variation'; product?: LocalProduct }> => {
      const hit = await findByBarcode(code);

      if (!hit) return { ok: false, reason: 'unknown' };

      // A product with several colours and no scan of its own: the cashier has
      // to say which one, or the shop's stock goes wrong in a way nobody sees.
      if (!hit.variation) return { ok: false, reason: 'pick-variation', product: hit.product };

      add(hit.product, hit.variation);

      return {
        ok: true,
        line: {
          key: lineKey(hit.product, hit.variation),
          product: hit.product,
          variation: hit.variation,
          quantity: 1,
          unitPrice: effectivePrice(
            { price: hit.product.price, discount_price: hit.product.discount_price },
            hit.variation
          ),
        },
      };
    },
    [add]
  );

  const totals: CartTotals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    // Whole dinars, matching what the server stores, so the drawer and the
    // report cannot disagree by the fractions a discount leaves behind.
    const rounded = Math.round(subtotal);
    const wanted =
      discount.mode === 'percent'
        ? rounded * (Math.min(Math.max(discount.value, 0), 100) / 100)
        : Math.max(discount.value, 0);
    const capped = Math.min(Math.round(wanted), rounded);

    return {
      subtotal: rounded,
      discount: capped,
      total: Math.max(0, rounded - capped),
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [lines, discount]);

  return {
    lines,
    totals,
    discount,
    setDiscount,
    customer,
    setCustomer,
    add,
    addCustom,
    setQuantity,
    remove,
    clear,
    scan,
    snapshot,
    restore,
  };
}
