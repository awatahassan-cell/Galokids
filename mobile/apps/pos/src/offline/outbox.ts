import { ApiError, NewOrder, Order, orders as ordersApi } from '@galokids/core';
import * as Crypto from 'expo-crypto';
import { db, getMeta, setMeta, DEVICE_PREFIX_KEY, RECEIPT_COUNTER_KEY } from './database';
import { decrementLocalStock } from './catalogue';

/**
 * Sales the till has taken but not yet handed to the server.
 *
 * This is the only table in the app whose rows exist nowhere else. A cached
 * product can be fetched again; a sale in here is money that has changed hands
 * and that nothing but this device knows about. So: append only, never delete
 * on a guess, and a row leaves `pending` only when the server has answered
 * with an order id.
 *
 * The rule that makes retrying safe is the idempotency key. It is generated
 * once, before the first attempt, stored with the sale, and sent unchanged
 * every time. A till that sends a sale, loses signal before the reply and
 * sends again gets back the order the server already made — rather than a
 * second sale with the stock taken off twice.
 */

export type OutboxStatus = 'pending' | 'synced' | 'rejected';

export interface OutboxRow {
  id: number;
  idempotency_key: string;
  invoice_no: string;
  payload: string;
  sold_at: string;
  total_amount: number;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
  server_order_id: number | null;
  created_at: string;
}

/** The till's own name, e.g. "POS1". Receipts and invoice numbers carry it. */
export async function devicePrefix(): Promise<string> {
  const existing = await getMeta(DEVICE_PREFIX_KEY);
  if (existing) return existing;

  // Until the shop names it, something short and unlikely to collide with
  // another till's numbers.
  const generated = `POS${Crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  await setMeta(DEVICE_PREFIX_KEY, generated);

  return generated;
}

export async function setDevicePrefix(prefix: string): Promise<void> {
  const clean = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (clean) await setMeta(DEVICE_PREFIX_KEY, clean);
}

/**
 * The number to print on this receipt.
 *
 * The server builds its own from the row id, which does not exist until the
 * row does — so an offline till cannot know it. This one is the device's, and
 * the server keeps it when the sale syncs. The prefix is what stops two tills
 * in the same shop printing the same number.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const prefix = await devicePrefix();
  const counter = Number((await getMeta(RECEIPT_COUNTER_KEY)) ?? '0') + 1;

  await setMeta(RECEIPT_COUNTER_KEY, String(counter));

  const today = new Date();
  const stamp =
    `${today.getFullYear()}` +
    `${String(today.getMonth() + 1).padStart(2, '0')}` +
    `${String(today.getDate()).padStart(2, '0')}`;

  return `${prefix}-${stamp}-${String(counter).padStart(4, '0')}`;
}

/**
 * Record a sale on the device, before any attempt to send it.
 *
 * Written first and sent second, always — including when the till has a
 * perfectly good connection. If the app is killed between taking the money and
 * hearing back, the sale is still here.
 */
export async function enqueueSale(
  order: Omit<NewOrder, 'idempotency_key' | 'sold_at' | 'invoice_no'>,
  options: { totalAmount: number; stockLines?: { variationId: number; quantity: number }[] }
): Promise<OutboxRow> {
  const conn = await db();

  const idempotencyKey = Crypto.randomUUID();
  const invoiceNo = await nextInvoiceNumber();
  const soldAt = new Date().toISOString();

  const payload: NewOrder = {
    ...order,
    idempotency_key: idempotencyKey,
    sold_at: soldAt,
    invoice_no: invoiceNo,
  };

  await conn.runAsync(
    `INSERT INTO outbox
       (idempotency_key, invoice_no, payload, sold_at, total_amount, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    idempotencyKey,
    invoiceNo,
    JSON.stringify(payload),
    soldAt,
    options.totalAmount,
    soldAt
  );

  // Keep the number on screen honest until the next sync tells us otherwise.
  if (options.stockLines?.length) {
    await decrementLocalStock(options.stockLines);
  }

  const row = await conn.getFirstAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE idempotency_key = ?',
    idempotencyKey
  );

  return row!;
}

export async function pendingSales(): Promise<OutboxRow[]> {
  const conn = await db();

  return conn.getAllAsync<OutboxRow>(
    "SELECT * FROM outbox WHERE status = 'pending' ORDER BY id ASC"
  );
}

export async function outboxCounts(): Promise<{ pending: number; rejected: number }> {
  const conn = await db();

  const pending = await conn.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox WHERE status = 'pending'"
  );
  const rejected = await conn.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox WHERE status = 'rejected'"
  );

  return { pending: pending?.n ?? 0, rejected: rejected?.n ?? 0 };
}

export async function recentSales(limit = 50): Promise<OutboxRow[]> {
  const conn = await db();

  return conn.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY id DESC LIMIT ?', limit);
}

/**
 * Hand one queued sale to the server.
 *
 * Returns what happened, because the three cases need different treatment and
 * telling them apart wrongly is how sales get lost or doubled:
 *
 *  - `synced`    the server has it. Safe to stop trying.
 *  - `retry`     we could not reach it, or it failed in a way that may pass
 *                later. The row stays pending and is tried again.
 *  - `rejected`  the server refused on the sale's own merits — a product that
 *                no longer exists, a validation error. Trying again will never
 *                help, so it is parked for a person to look at rather than
 *                retried forever or silently dropped.
 */
export async function pushSale(row: OutboxRow): Promise<'synced' | 'retry' | 'rejected'> {
  const conn = await db();
  const now = new Date().toISOString();

  let payload: NewOrder;
  try {
    payload = JSON.parse(row.payload) as NewOrder;
  } catch {
    await markRejected(row.id, 'The saved sale could not be read.');
    return 'rejected';
  }

  try {
    const order: Order = await ordersApi.create(payload, 20000);

    await conn.runAsync(
      "UPDATE outbox SET status = 'synced', server_order_id = ?, attempts = attempts + 1, last_attempt_at = ?, last_error = NULL WHERE id = ?",
      order.id,
      now,
      row.id
    );

    return 'synced';
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;

    // Could not ask. Not the sale's fault — keep it and try later.
    if (!apiError || apiError.isOffline) {
      await bumpAttempt(row.id, apiError?.message ?? 'Could not reach the server.');
      return 'retry';
    }

    // The session expired, or the server is having a bad time. Both pass.
    if (apiError.status === 401 || apiError.status === 429 || apiError.status >= 500) {
      await bumpAttempt(row.id, apiError.message);
      return 'retry';
    }

    // 4xx on the sale itself. Retrying sends the identical body and gets the
    // identical refusal, so park it where a person will see it.
    await markRejected(row.id, apiError.message);
    return 'rejected';
  }
}

async function bumpAttempt(id: number, message: string): Promise<void> {
  const conn = await db();

  await conn.runAsync(
    'UPDATE outbox SET attempts = attempts + 1, last_attempt_at = ?, last_error = ? WHERE id = ?',
    new Date().toISOString(),
    message,
    id
  );
}

async function markRejected(id: number, message: string): Promise<void> {
  const conn = await db();

  await conn.runAsync(
    "UPDATE outbox SET status = 'rejected', attempts = attempts + 1, last_attempt_at = ?, last_error = ? WHERE id = ?",
    new Date().toISOString(),
    message,
    id
  );
}

/**
 * Try a rejected sale again, after someone has fixed whatever it complained
 * about. Only a person does this — never the sync loop, which is what
 * `rejected` means.
 */
export async function retryRejected(id: number): Promise<void> {
  const conn = await db();
  await conn.runAsync("UPDATE outbox SET status = 'pending', last_error = NULL WHERE id = ?", id);
}
