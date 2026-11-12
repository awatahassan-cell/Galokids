import * as SQLite from 'expo-sqlite';

/**
 * The till's own copy of what it needs to sell.
 *
 * Two jobs. The catalogue is a cache: whatever is here came from the server
 * and can be thrown away and fetched again. The outbox is not — a sale in it
 * exists nowhere else until it syncs, so it is the one table where losing a
 * row loses money.
 *
 * That difference decides everything about how they are treated. The catalogue
 * is replaced freely on every sync. The outbox is only ever appended to, and a
 * row leaves it only once the server has confirmed the sale by id.
 */

let database: SQLite.SQLiteDatabase | null = null;

export async function db(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  database = await SQLite.openDatabaseAsync('galokids-pos.db');

  // WAL so a sync writing the catalogue cannot block the cashier reading it.
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(database);

  return database;
}

async function migrate(conn: SQLite.SQLiteDatabase): Promise<void> {
  await conn.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id              INTEGER PRIMARY KEY,
      name            TEXT NOT NULL,
      name_ku         TEXT,
      name_ar         TEXT,
      price           REAL NOT NULL,
      discount_price  REAL,
      cost            REAL,
      sku             TEXT,
      image_url       TEXT,
      category_id     INTEGER,
      is_active       INTEGER NOT NULL DEFAULT 1,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS variations (
      id              INTEGER PRIMARY KEY,
      product_id      INTEGER NOT NULL,
      color           TEXT,
      size            TEXT,
      stock_quantity  INTEGER NOT NULL DEFAULT 0,
      sku             TEXT,
      barcode         TEXT,
      price_override  REAL
    );

    -- Scanning is the one thing that must never feel slow.
    CREATE INDEX IF NOT EXISTS variations_barcode ON variations (barcode);
    CREATE INDEX IF NOT EXISTS variations_product ON variations (product_id);
    CREATE INDEX IF NOT EXISTS products_sku ON products (sku);

    -- Sales taken while there was no signal. Nothing else holds these.
    CREATE TABLE IF NOT EXISTS outbox (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      -- Made once, before the first attempt, and never changed. It is what
      -- lets the server recognise a retry instead of ringing up a second sale.
      idempotency_key    TEXT NOT NULL UNIQUE,
      invoice_no         TEXT NOT NULL,
      payload            TEXT NOT NULL,
      sold_at            TEXT NOT NULL,
      total_amount       REAL NOT NULL,
      status             TEXT NOT NULL DEFAULT 'pending',
      attempts           INTEGER NOT NULL DEFAULT 0,
      last_error         TEXT,
      last_attempt_at    TEXT,
      -- The server's id, once it has one. Set means done.
      server_order_id    INTEGER,
      created_at         TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS outbox_status ON outbox (status);

    -- Small key/value notes: when we last synced, the device's name, the
    -- running receipt number.
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/* ------------------------------------------------------------- meta --- */

export async function getMeta(key: string): Promise<string | null> {
  const conn = await db();
  const row = await conn.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    key
  );

  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const conn = await db();
  await conn.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

/** Throw the cached catalogue away. The outbox is deliberately untouched. */
export async function resetCatalogue(): Promise<void> {
  const conn = await db();
  await conn.execAsync('DELETE FROM variations; DELETE FROM products;');
  await conn.runAsync('DELETE FROM meta WHERE key = ?', SYNC_CURSOR_KEY);
}

export const SYNC_CURSOR_KEY = 'catalogue.updated_since';
export const DEVICE_PREFIX_KEY = 'device.prefix';
export const RECEIPT_COUNTER_KEY = 'device.receipt_counter';
