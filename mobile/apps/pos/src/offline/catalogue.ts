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

/**
 * What to show on the till before anybody has typed anything.
 *
 * A cashier in this shop picks a garment off a wall of pictures far more often
 * than they scan one — children's clothes come in without a tag as often as
 * with one. An empty grid waiting for a search term is a till that cannot sell
 * the thing in the customer's hand.
 *
 * Ordered by what the shop touched most recently, because that is what is in
 * the window and on the counter this week.
 */
export async function browseProducts(limit = 60): Promise<LocalProduct[]> {
  const conn = await db();

  return conn.getAllAsync<LocalProduct>(
    `SELECT * FROM products
     WHERE is_active = 1
     ORDER BY updated_at DESC, name
     LIMIT ?`,
    limit
  );
}

/** Every variation for a set of products, in one query rather than one each. */
export async function variationsForMany(
  productIds: number[]
): Promise<Map<number, LocalVariation[]>> {
  const map = new Map<number, LocalVariation[]>();
  if (productIds.length === 0) return map;

  const conn = await db();

  // The ids are numbers this code just read out of its own database, so the
  // list is built rather than bound — but it is still forced through Number()
  // so nothing but digits can reach the statement.
  const ids = productIds.map(id => Number(id)).filter(Number.isFinite).join(',');
  if (!ids) return map;

  const rows = await conn.getAllAsync<LocalVariation>(
    `SELECT * FROM variations WHERE product_id IN (${ids}) ORDER BY color, size`
  );

  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }

  return map;
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

/* ----------------------------------------------------------- stock audit --- */

export type StockStatus = 'all' | 'low' | 'out' | 'missingCost';
export type StockSort = 'name' | 'highestCost' | 'highestRetail' | 'highestProfit' | 'highestStock' | 'lowestStock';

/** A product with its stock worked out: what is on the shelf, and what that is worth. */
export interface StockRow {
  product: LocalProduct;
  pieces: number;
  variationCount: number;
  costValue: number;
  retailValue: number;
}

/** How few pieces count as "low". The same threshold the pills use. */
export const LOW_STOCK = 5;

/**
 * The stock audit's rows, filtered and ordered in the database.
 *
 * Done in SQL rather than over whatever page happens to be loaded: totals taken
 * from sixty rows of three hundred are sixty rows' worth, and look exactly like
 * the shop's. Valued at the price a customer pays — the discount if there is
 * one — and at cost for what the shop paid.
 */
export async function stockRows(options: {
  search?: string;
  categoryId?: number | null;
  status?: StockStatus;
  sort?: StockSort;
  limit?: number;
}): Promise<StockRow[]> {
  const conn = await db();
  const params: (string | number)[] = [];
  const where: string[] = [];

  const term = options.search?.trim();
  if (term) {
    const like = `%${term}%`;
    where.push('(p.name LIKE ? OR p.name_ku LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ? OR p.id IN (SELECT product_id FROM variations WHERE barcode LIKE ?))');
    params.push(like, like, like, like, like);
  }

  if (options.categoryId != null) {
    where.push('p.category_id = ?');
    params.push(options.categoryId);
  }

  const having =
    options.status === 'low'
      ? `HAVING pieces > 0 AND pieces <= ${LOW_STOCK}`
      : options.status === 'out'
        ? 'HAVING pieces <= 0'
        : options.status === 'missingCost'
          ? 'HAVING (p.cost IS NULL OR p.cost <= 0)'
          : '';

  const order = {
    name: 'p.name',
    highestCost: 'cost_value DESC',
    highestRetail: 'retail_value DESC',
    highestProfit: '(retail_value - cost_value) DESC',
    highestStock: 'pieces DESC',
    lowestStock: 'pieces ASC',
  }[options.sort ?? 'name'];

  params.push(options.limit ?? 80);

  const rows = await conn.getAllAsync<
    LocalProduct & { pieces: number; variation_count: number; cost_value: number; retail_value: number }
  >(
    `SELECT p.*,
            COALESCE(SUM(v.stock_quantity), 0) AS pieces,
            COUNT(v.id) AS variation_count,
            COALESCE(SUM(v.stock_quantity), 0) * COALESCE(p.cost, 0) AS cost_value,
            COALESCE(SUM(v.stock_quantity), 0) *
              (CASE WHEN p.discount_price > 0 THEN p.discount_price ELSE p.price END) AS retail_value
       FROM products p
       LEFT JOIN variations v ON v.product_id = p.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       GROUP BY p.id
       ${having}
       ORDER BY ${order}
       LIMIT ?`,
    ...params
  );

  return rows.map(row => {
    const { pieces, variation_count, cost_value, retail_value, ...product } = row;

    return {
      product: product as LocalProduct,
      pieces,
      variationCount: variation_count,
      costValue: cost_value,
      retailValue: retail_value,
    };
  });
}

/** The whole shelf in five numbers, independent of any search or filter. */
export async function stockTotals(): Promise<{
  products: number;
  variations: number;
  pieces: number;
  costValue: number;
  retailValue: number;
  missingCost: number;
  outOfStock: number;
}> {
  const conn = await db();

  const row = await conn.getFirstAsync<{
    products: number;
    variations: number;
    pieces: number;
    cost_value: number;
    retail_value: number;
    missing_cost: number;
    out_of_stock: number;
  }>(
    `SELECT COUNT(*) AS products,
            COALESCE(SUM(vc), 0) AS variations,
            COALESCE(SUM(pieces), 0) AS pieces,
            COALESCE(SUM(pieces * COALESCE(cost, 0)), 0) AS cost_value,
            COALESCE(SUM(pieces * price_now), 0) AS retail_value,
            COALESCE(SUM(CASE WHEN cost IS NULL OR cost <= 0 THEN 1 ELSE 0 END), 0) AS missing_cost,
            COALESCE(SUM(CASE WHEN pieces <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock
       FROM (
         SELECT p.cost AS cost,
                CASE WHEN p.discount_price > 0 THEN p.discount_price ELSE p.price END AS price_now,
                COALESCE(SUM(v.stock_quantity), 0) AS pieces,
                COUNT(v.id) AS vc
           FROM products p LEFT JOIN variations v ON v.product_id = p.id
          GROUP BY p.id
       )`
  );

  return {
    products: row?.products ?? 0,
    variations: row?.variations ?? 0,
    pieces: row?.pieces ?? 0,
    costValue: row?.cost_value ?? 0,
    retailValue: row?.retail_value ?? 0,
    missingCost: row?.missing_cost ?? 0,
    outOfStock: row?.out_of_stock ?? 0,
  };
}
