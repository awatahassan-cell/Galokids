import { ApiError, catalogue as catalogueApi } from '@galokids/core';
import { getMeta, setMeta, SYNC_CURSOR_KEY } from './database';
import { catalogueSize, upsertProducts } from './catalogue';
import { outboxCounts, pendingSales, pushSale } from './outbox';

/**
 * Keeping the device and the server in step.
 *
 * Order matters: sales go up before the catalogue comes down. A sale is money
 * that exists only on this device, and the catalogue is a cache that can be
 * refetched forever — so if the connection lasts for exactly one request, that
 * request should be a sale.
 */

export interface SyncResult {
  pushed: number;
  rejected: number;
  pulled: number;
  stillPending: number;
  /** Set when the sync stopped early; the caller decides whether to say so. */
  problem?: string;
}

let running = false;

/**
 * Push what we owe, then pull what has changed.
 *
 * Guarded against running twice at once. Two passes pushing the same row would
 * be safe — the idempotency key sees to that — but they would race on the
 * cursor and could skip a page of catalogue changes, which is not.
 */
export async function sync(options: { pullCatalogue?: boolean } = {}): Promise<SyncResult> {
  if (running) {
    const counts = await outboxCounts();
    return { pushed: 0, rejected: 0, pulled: 0, stillPending: counts.pending, problem: 'busy' };
  }

  running = true;

  try {
    let pushed = 0;
    let rejected = 0;
    let problem: string | undefined;

    // ---- 1. the sales, oldest first ---------------------------------
    for (const sale of await pendingSales()) {
      const outcome = await pushSale(sale);

      if (outcome === 'synced') {
        pushed += 1;
        continue;
      }

      if (outcome === 'rejected') {
        rejected += 1;
        continue;
      }

      // Could not reach the server. Stop rather than march through the whole
      // queue failing: each attempt costs a timeout, and they will all fail
      // the same way. The rest keep their place and go next time.
      problem = 'offline';
      break;
    }

    // ---- 2. the catalogue -------------------------------------------
    let pulled = 0;

    if (options.pullCatalogue !== false && problem !== 'offline') {
      try {
        pulled = await pullCatalogue();
      } catch (error) {
        problem = error instanceof ApiError && error.isOffline ? 'offline' : 'catalogue';
      }
    }

    const counts = await outboxCounts();

    return { pushed, rejected, pulled, stillPending: counts.pending, problem };
  } finally {
    running = false;
  }
}

/**
 * Bring down what changed since last time.
 *
 * The cursor is only moved once a page has actually been written, so an
 * interrupted sync re-reads that page rather than skipping it. Re-reading is
 * harmless — the writes are upserts — and skipping would leave the till
 * selling at a price the shop has changed.
 */
async function pullCatalogue(): Promise<number> {
  const empty = (await catalogueSize()).products === 0;
  const since = empty ? null : await getMeta(SYNC_CURSOR_KEY);

  let page = 1;
  let written = 0;
  let newestSeen = since;

  // A hard stop: a cursor that somehow never advances must not loop forever.
  for (let guard = 0; guard < 200; guard += 1) {
    const response = since
      ? await catalogueApi.productsChangedSince(since, page, 100)
      : await catalogueApi.products({ page, limit: 100, includeInactive: true });

    const products = response.data ?? [];
    if (products.length === 0) break;

    await upsertProducts(products);
    written += products.length;

    for (const product of products) {
      if (!newestSeen || product.updated_at > newestSeen) newestSeen = product.updated_at;
    }

    // Written, so it is safe to remember we have it.
    if (newestSeen) await setMeta(SYNC_CURSOR_KEY, newestSeen);

    if (page >= (response.last_page ?? 1)) break;
    page += 1;
  }

  // A first full pull has no "newest changed" to go on until something is
  // written; start the clock now so the next sync asks for a difference.
  if (!newestSeen) await setMeta(SYNC_CURSOR_KEY, new Date().toISOString());

  return written;
}

/** When the catalogue was last brought down, for the screen to show. */
export async function lastSyncedAt(): Promise<Date | null> {
  const cursor = await getMeta(SYNC_CURSOR_KEY);
  if (!cursor) return null;

  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}
