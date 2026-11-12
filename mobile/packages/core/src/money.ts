/**
 * Iraqi dinar, as the shop writes it.
 *
 * Whole units only. The backend rounds before it stores a total so the receipt,
 * the drawer and the shift report cannot disagree by the fractions a percentage
 * discount leaves behind; showing decimals here would reintroduce exactly that
 * confusion at the counter.
 */
export function formatIQD(amount: number | string | null | undefined): string {
  const value = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(value)) return '0 د.ع';

  return `${value.toLocaleString('en-US')} د.ع`;
}

/** What a line actually sells for: the discount when there is one. */
export function effectivePrice(
  product: { price: number; discount_price?: number | null },
  variation?: { price_override?: number | null } | null
): number {
  if (variation?.price_override != null && variation.price_override > 0) {
    return Number(variation.price_override);
  }

  const discount = product.discount_price;
  return discount != null && discount > 0 ? Number(discount) : Number(product.price);
}
