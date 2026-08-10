import { Product } from '../types';

/**
 * A product at or below this many pieces in stock counts as "low stock".
 *
 * Kept in one place because the products table, the inventory audit and the
 * low-stock alert all used to pick their own number (10 here, 5 there), so the
 * same product could be red on one screen and green on another.
 */
export const LOW_STOCK_THRESHOLD = 5;

/** Total pieces on hand across every variation of a product. */
export const getTotalStock = (product: Pick<Product, 'variations'>): number =>
  (product.variations || []).reduce((sum, v) => sum + (Number(v?.stockQuantity) || 0), 0);

export const isLowStock = (product: Pick<Product, 'variations'>): boolean => {
  const stock = getTotalStock(product);
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
};

export const isOutOfStock = (product: Pick<Product, 'variations'>): boolean =>
  getTotalStock(product) === 0;
