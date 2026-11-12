import assert from 'node:assert/strict';
import { apiCalls, coreStub, whenCreatingOrder } from './harness';

import { enqueueSale, pendingSales, pushSale, outboxCounts, retryRejected, nextInvoiceNumber, setDevicePrefix } from '../outbox';
import { upsertProducts, findByBarcode, catalogueSize, decrementLocalStock, variationsFor } from '../catalogue';
import { sync } from '../sync';

const { ApiError } = coreStub;

let passed = 0;
let failed = 0;

async function test(name: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  FAIL  ${name}`);
    console.log((error as Error).message.split('\n').slice(0,6).map(l => '        ' + l).join('\n'));
    failed += 1;
  }
}

const SALE = {
  items: [{ product_variation_id: 1, quantity: 2 }],
  channel: 'pos' as const,
  payment_method: 'cash',
};

console.log('\n— the sale is written down before it is sent —');

await test('a sale is queued with a key, an invoice number and a time', async () => {
  const row = await enqueueSale(SALE, { totalAmount: 20000 });

  assert.ok(row.idempotency_key, 'must carry a key');
  assert.match(row.invoice_no, /^POS[A-Z0-9]+-\d{8}-\d{4}$/, `invoice looked like ${row.invoice_no}`);
  assert.equal(row.status, 'pending');
  assert.ok(row.sold_at, 'must record when the money was taken');

  const payload = JSON.parse(row.payload);
  assert.equal(payload.idempotency_key, row.idempotency_key);
  assert.equal(payload.invoice_no, row.invoice_no);
  assert.equal(payload.sold_at, row.sold_at);
});

await test('two sales never share an invoice number', async () => {
  const a = await enqueueSale(SALE, { totalAmount: 1000 });
  const b = await enqueueSale(SALE, { totalAmount: 1000 });

  assert.notEqual(a.invoice_no, b.invoice_no);
  assert.notEqual(a.idempotency_key, b.idempotency_key);
});

await test('the shop can name the till, and the name goes on the receipt', async () => {
  await setDevicePrefix('pos-2!');
  const invoice = await nextInvoiceNumber();

  assert.match(invoice, /^POS2-/, `got ${invoice}`);
});

console.log('\n— the three outcomes of a push —');

await test('a reachable server means synced, once', async () => {
  apiCalls.reset();
  const row = await enqueueSale(SALE, { totalAmount: 5000 });

  whenCreatingOrder(async () => ({ id: 4242 }));
  const outcome = await pushSale(row);

  assert.equal(outcome, 'synced');
  assert.equal(apiCalls.length, 1);

  const stillPending = (await pendingSales()).map(r => r.id);
  assert.ok(!stillPending.includes(row.id), 'a synced sale must leave the queue');
});

await test('no signal means retry, and the sale keeps its place', async () => {
  apiCalls.reset();
  const row = await enqueueSale(SALE, { totalAmount: 5000 });

  whenCreatingOrder(async () => {
    throw new ApiError('no signal', 0, undefined, 'network');
  });

  assert.equal(await pushSale(row), 'retry');

  const pending = await pendingSales();
  assert.ok(pending.some(r => r.id === row.id), 'it must still be queued');
  assert.equal(pending.find(r => r.id === row.id)!.attempts, 1);
});

await test('a 500 means retry — the server may be fine in a minute', async () => {
  const row = await enqueueSale(SALE, { totalAmount: 5000 });
  whenCreatingOrder(async () => {
    throw new ApiError('server error', 500);
  });

  assert.equal(await pushSale(row), 'retry');
});

await test('an expired session means retry, not a lost sale', async () => {
  const row = await enqueueSale(SALE, { totalAmount: 5000 });
  whenCreatingOrder(async () => {
    throw new ApiError('Unauthenticated.', 401);
  });

  assert.equal(await pushSale(row), 'retry');
  assert.ok((await pendingSales()).some(r => r.id === row.id));
});

await test('a 422 means rejected — retrying sends the same body', async () => {
  const row = await enqueueSale(SALE, { totalAmount: 5000 });
  whenCreatingOrder(async () => {
    throw new ApiError('That product no longer exists.', 422);
  });

  assert.equal(await pushSale(row), 'rejected');

  const pending = await pendingSales();
  assert.ok(!pending.some(r => r.id === row.id), 'a rejected sale must not be retried by the loop');

  const counts = await outboxCounts();
  assert.ok(counts.rejected >= 1);
});

await test('a rejected sale is parked, not deleted, and a person can retry it', async () => {
  const row = await enqueueSale(SALE, { totalAmount: 5000 });
  whenCreatingOrder(async () => {
    throw new ApiError('nope', 422);
  });
  await pushSale(row);

  await retryRejected(row.id);
  assert.ok((await pendingSales()).some(r => r.id === row.id), 'it comes back when a person says so');
});

console.log('\n— the point of the key: a retry must not charge twice —');

await test('the same key goes up on every attempt', async () => {
  apiCalls.reset();
  const row = await enqueueSale(SALE, { totalAmount: 7000 });

  whenCreatingOrder(async () => {
    throw new ApiError('lost signal mid-request', 0);
  });
  await pushSale(row);

  const again = (await pendingSales()).find(r => r.id === row.id)!;
  whenCreatingOrder(async () => ({ id: 99 }));
  await pushSale(again);

  assert.equal(apiCalls.length, 2);
  const [first, second] = apiCalls.list.map(c => (c.body as any).idempotency_key);
  assert.equal(first, second, 'the key must not change between attempts');
  assert.equal(first, row.idempotency_key);
});

await test('the sale time sent is when the money was taken, not when it synced', async () => {
  apiCalls.reset();
  const row = await enqueueSale(SALE, { totalAmount: 7000 });

  whenCreatingOrder(async () => ({ id: 100 }));
  await pushSale(row);

  assert.equal((apiCalls.at(0)!.body as any).sold_at, row.sold_at);
});

console.log('\n— scanning —');

await test('a variation barcode finds the exact colour and size', async () => {
  await upsertProducts([
    {
      id: 1, name: 'Kids Tee', name_ku: null, name_ar: null, description: null,
      description_ku: null, description_ar: null, price: 10000, discount_price: null,
      image_url: null, images: [], gender: 0, sku: 'GALO000001', barcode: 'GALO000001',
      category_id: 1, is_active: true, updated_at: '2026-11-10T10:00:00Z',
      variations: [
        { id: 11, product_id: 1, color: 'Red', size: 'S', stock_quantity: 5, sku: 'GALO000002', barcode: 'GALO000002', price_override: null },
        { id: 12, product_id: 1, color: 'Blue', size: 'M', stock_quantity: 3, sku: 'GALO000003', barcode: 'GALO000003', price_override: null },
      ],
    } as any,
  ]);

  const hit = await findByBarcode('GALO000003');
  assert.ok(hit, 'the scan must find something');
  assert.equal(hit!.product.name, 'Kids Tee');
  assert.equal(hit!.variation?.color, 'Blue');
  assert.equal(hit!.variation?.size, 'M');
});

await test("a product's own barcode with one variation sells that variation", async () => {
  await upsertProducts([
    {
      id: 2, name: 'Single', name_ku: null, name_ar: null, description: null,
      description_ku: null, description_ar: null, price: 5000, discount_price: null,
      image_url: null, images: [], gender: 0, sku: 'GALO000010', barcode: 'GALO000010',
      category_id: 1, is_active: true, updated_at: '2026-11-10T10:00:00Z',
      variations: [{ id: 21, product_id: 2, color: null, size: null, stock_quantity: 9, sku: null, barcode: null, price_override: null }],
    } as any,
  ]);

  const hit = await findByBarcode('GALO000010');
  assert.equal(hit?.variation?.id, 21, 'one variation and no scan of its own: that is the thing');
});

await test('an unknown code finds nothing rather than guessing', async () => {
  assert.equal(await findByBarcode('NOT-A-CODE'), null);
});

await test('a variation deleted on the server disappears from the till', async () => {
  await upsertProducts([
    {
      id: 1, name: 'Kids Tee', name_ku: null, name_ar: null, description: null,
      description_ku: null, description_ar: null, price: 10000, discount_price: null,
      image_url: null, images: [], gender: 0, sku: 'GALO000001', barcode: 'GALO000001',
      category_id: 1, is_active: true, updated_at: '2026-11-11T10:00:00Z',
      variations: [
        { id: 11, product_id: 1, color: 'Red', size: 'S', stock_quantity: 5, sku: 'GALO000002', barcode: 'GALO000002', price_override: null },
      ],
    } as any,
  ]);

  assert.equal(await findByBarcode('GALO000003'), null, 'the blue one is gone');
  assert.equal((await variationsFor(1)).length, 1);
});

console.log('\n— the count on screen between syncs —');

await test('selling takes stock off the device, never below zero', async () => {
  await decrementLocalStock([{ variationId: 11, quantity: 2 }]);
  assert.equal((await variationsFor(1))[0]!.stock_quantity, 3);

  await decrementLocalStock([{ variationId: 11, quantity: 99 }]);
  assert.equal((await variationsFor(1))[0]!.stock_quantity, 0, 'clamped, as the server ledger does');
});

console.log('\n— the order of a sync —');

await test('sales go up before the catalogue comes down', async () => {
  apiCalls.reset();
  const order: string[] = [];

  await enqueueSale(SALE, { totalAmount: 1000 });
  whenCreatingOrder(async () => {
    order.push('sale');
    return { id: 1 };
  });

  const original = coreStub.catalogue.products;
  coreStub.catalogue.products = (async () => {
    order.push('catalogue');
    return { data: [], last_page: 1 };
  }) as any;
  coreStub.catalogue.productsChangedSince = (async () => {
    order.push('catalogue');
    return { data: [], last_page: 1 };
  }) as any;

  await sync();
  coreStub.catalogue.products = original;

  assert.ok(order.length >= 1, 'something ran');
  assert.equal(order[0], 'sale', 'the sale is the first thing sent');
});

await test('a sync with no signal stops instead of timing out on every sale', async () => {
  for (let i = 0; i < 3; i += 1) await enqueueSale(SALE, { totalAmount: 1000 });

  apiCalls.reset();
  whenCreatingOrder(async () => {
    throw new ApiError('no signal', 0);
  });

  const result = await sync();

  assert.equal(result.problem, 'offline');
  assert.equal(apiCalls.length, 1, 'it gives up after the first failure, not after every sale');
  assert.ok(result.stillPending >= 3, 'and nothing is lost');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
