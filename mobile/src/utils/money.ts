import type { Language } from '../i18n/strings';
import type { Product, ProductVariation } from '../api/types';

/**
 * Prices, worked out the same way the server works them out.
 *
 * These rules are copied from the website's `utils/pricing.ts`, which in turn
 * matches `OrderController::store()`. If the app totals a basket differently
 * from the server, the customer is quoted one figure and charged another —
 * so the rule lives in one place and is repeated exactly, not approximated.
 */

/** The price of one piece: a variation's own price wins, then any discount. */
export function unitPrice(
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation?: Pick<ProductVariation, 'priceOverride'> | null
): number {
  const override = Number(variation?.priceOverride ?? NaN);
  if (Number.isFinite(override) && override > 0) return override;

  const discount = Number(product?.discountPrice ?? NaN);
  if (Number.isFinite(discount) && discount > 0) return discount;

  const price = Number(product?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

/** The price struck through beside the current one, when there is a saving. */
export function wasPrice(
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation?: Pick<ProductVariation, 'priceOverride'> | null
): number | null {
  const current = unitPrice(product, variation);
  const full = Number(product?.price ?? 0);
  return full > current ? full : null;
}

export function discountPercent(
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation?: Pick<ProductVariation, 'priceOverride'> | null
): number {
  const full = Number(product?.price ?? 0);
  const current = unitPrice(product, variation);
  if (full <= 0 || current >= full) return 0;
  return Math.round(((full - current) / full) * 100);
}

export function lineTotal(
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation: Pick<ProductVariation, 'priceOverride'> | null | undefined,
  quantity: number
): number {
  return unitPrice(product, variation) * (Number(quantity) || 0);
}

/**
 * The dinar has no sub-unit in daily use, so every amount that reaches a
 * receipt is whole. Without this a 15% coupon on 33,333 shows as 4,999.95.
 */
export function roundIQD(amount: number): number {
  return Math.round(Number(amount) || 0);
}

const groupSeparator = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Formatted without `Intl.NumberFormat`.
 *
 * React Native's JavaScript engine ships a cut-down ICU on Android unless the
 * app opts into the full build, and the cut-down one silently formats some
 * locales wrong. Grouping thousands is simple enough to do outright and then
 * it reads the same on every phone.
 */
export function formatIQD(value: number): string {
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(groupSeparator, ',');
}

export function formatPrice(value: number, language: Language): string {
  const symbol = language === 'en' ? 'IQD' : 'د.ع';
  return `${formatIQD(value)} ${symbol}`;
}
