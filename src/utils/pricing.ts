import { Product, ProductVariation } from '../types';

/**
 * The price a customer actually pays for one piece.
 *
 * This MUST match how the server prices a line in
 * `OrderController::store()`:
 *
 *     $unitPrice = $variation->price_override ?? ($product->discount_price ?? $product->price);
 *
 * The POS used to total up `product.price` while the cart rows displayed
 * `discountPrice` and the server charged `discountPrice` — three different
 * numbers for the same sale, so the cashier collected the wrong cash and the
 * shift never reconciled.
 */
export const getUnitPrice = (
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation?: Pick<ProductVariation, 'priceOverride'> | null
): number => {
  const override = Number(variation?.priceOverride ?? NaN);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }

  const discount = Number(product?.discountPrice ?? NaN);
  if (Number.isFinite(discount) && discount > 0) {
    return discount;
  }

  const price = Number(product?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
};

/** Line total for a quantity of one product/variation. */
export const getLineTotal = (
  product: Pick<Product, 'price' | 'discountPrice'> | null | undefined,
  variation: Pick<ProductVariation, 'priceOverride'> | null | undefined,
  quantity: number
): number => getUnitPrice(product, variation) * (Number(quantity) || 0);

/**
 * Iraqi dinar has no sub-unit in daily use — every amount that reaches a
 * receipt, a cash drawer or the database should be a whole dinar. Without this
 * a 15% coupon on 33,333 produced 4,999.95 and totals like 28,333.05.
 */
export const roundIQD = (amount: number): number => Math.round(Number(amount) || 0);
