import { Product } from '@galokids/core';
import { db } from './database';

/**
 * Reading and writing the till's cached catalogue.
 *
 * Everything the cashier does while selling reads from here, never from the
 * network: a scan has to answer instantly and has to answer at all when the
 * shop's connection is down, which in practice is often.
 */

export interface LocalVariation {
  id: number;
  product_id: number;
  color: string | null;
  size: string | null;
  stock_quantity: number;
  sku: string | null;
  barcode: string | null;
  price_override: number | null;
}

export interface LocalProduct {
  id: number;
  name: string;
  name_ku: string | null;
  name_ar: string | null;
  price: number;
  discount_price: number | null;
  cost: number | null;
  sku: string | null;
  image_url: string | null;
  category_id: number | null;
  is_active: number;
  updated_at: string;
}

export interface ScanHit {
  product: LocalProduct;
  variation: LocalVariation | null;
}

/** Write a page of products from the server into the device's catalogue. */
export async function upsertProducts(products: Product[]): Promise<void> {
  if (products.length === 0) return;

  const conn = await db();

  await conn.withTransactionAsync(async () => {
    for (const product of products) {
      await conn.runAsync(
        `INSERT INTO products
           (id, name, name_ku, name_ar, price, discount_price, cost, sku, image_url, category_id, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, name_ku = excluded.name_ku, name_ar = excluded.name_ar,
           price = excluded.price, discount_price = excluded.discount_price, cost = excluded.cost,
           sku = excluded.sku, image_url = excluded.image_url, category_id = excluded.category_id,
           is_active = excluded.is_active, updated_at = excluded.updated_at`,
        product.id,
        product.name,
        product.name_ku,
        product.name_ar,
        product.price,
        product.discount_price,
        product.cost ?? null,
        product.sku,
        product.image_url,
        product.category_id,
        product.is_active === false ? 0 : 1,
        product.updated_at
      );

      // Replace the whole set rather than merging: a variation deleted on the
      // server has to disappear here too, or the till goes on offering a
      // colour the shop no longer stocks.
      await conn.runAsync('DELETE FROM variations WHERE product_id = ?', product.id);

      for (const variation of product.variations ?? []) {
        await conn.runAsync(
          `INSERT INTO variations
             (id, product_id, color, size, stock_quantity, sku, barcode, price_override)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          variation.id,
          product.id,
          variation.color,
          variation.size,
          variation.stock_quantity ?? 0,
          variation.sku,
          variation.barcode,
          variation.price_override
        );
      }
    }
  });
}

/**
 * What was just scanned.
 *
 * A variation's barcode is checked before the product's, because that is the
 * one on the garment's own label and it identifies the exact colour and size.
 * The product's code is the fallback for a line that was never broken out.
 */
export async function findByBarcode(code: string): Promise<ScanHit | null> {
  const scanned = code.trim();
  if (!scanned) return null;

  const conn = await db();

  const variation = await conn.getFirstAsync<LocalVariation>(
    'SELECT * FROM variations WHERE barcode = ? OR sku = ? LIMIT 1',
    scanned,
    scanned
  );

  if (variation) {
    const product = await conn.getFirstAsync<LocalProduct>(
      'SELECT * FROM products WHERE id = ?',
      variation.product_id
    );

    return product ? { product, variation } : null;
  }

  const product = await conn.getFirstAsync<LocalProduct>(
    'SELECT * FROM products WHERE sku = ? LIMIT 1',
    scanned
  );

  if (!product) return null;

  // One variation and no scan of its own: that is the thing being sold.
  const only = await conn.getAllAsync<LocalVariation>(
    'SELECT * FROM variations WHERE product_id = ?',
    product.id
  );

  return { product, variation: only.length === 1 ? only[0]! : null };
}

/** Search the device's catalogue by name or code, for typing rather than scanning. */
export async function searchProducts(term: string, limit = 30): Promise<LocalProduct[]> {
  const conn = await db();
  const query = `%${term.trim()}%`;

  return conn.getAllAsync<LocalProduct>(
    `SELECT * FROM products
     WHERE is_active = 1
       AND (name LIKE ? OR name_ku LIKE ? OR name_ar LIKE ? OR sku LIKE ?)
     ORDER BY name
     LIMIT ?`,
    query,
    query,
    query,
    query,
    limit
  );
}

export async function variationsFor(productId: number): Promise<LocalVariation[]> {
  const conn = await db();

  return conn.getAllAsync<LocalVariation>(
    'SELECT * FROM variations WHERE product_id = ? ORDER BY color, size',
    productId
  );
}

export async function catalogueSize(): Promise<{ products: number; variations: number }> {
  const conn = await db();

  const products = await conn.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM products');
  const variations = await conn.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM variations');

  return { products: products?.n ?? 0, variations: variations?.n ?? 0 };
}

/**
 * Take sold pieces off the device's own count.
 *
 * The server is the real ledger; this keeps the number on screen honest
 * between syncs so a cashier is not told there are three left after selling
 * the last one. Never below zero, matching what the server's ledger does.
 */
export async function decrementLocalStock(
  lines: { variationId: number; quantity: number }[]
): Promise<void> {
  if (lines.length === 0) return;

  const conn = await db();

  await conn.withTransactionAsync(async () => {
    for (const line of lines) {
      await conn.runAsync(
        'UPDATE variations SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?',
        line.quantity,
        line.variationId
      );
    }
  });
}
