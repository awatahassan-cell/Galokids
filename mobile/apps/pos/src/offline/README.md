# The till without a signal

A shop's connection drops. The till keeps selling.

## What is on the device

`database.ts` opens one SQLite file with two kinds of table, and the difference
between them decides how everything else behaves.

**The catalogue** — `products`, `variations` — is a cache. Every row came from
the server and can be thrown away and fetched again. It is replaced freely.

**The outbox** is not. A sale in it is money that has changed hands and that
nothing but this device knows about. It is appended to and never deleted on a
guess; a row leaves `pending` only when the server has answered with an order
id.

## Why a sale can be sent twice safely

Every sale gets an `idempotency_key` when it is written down, before the first
attempt, and sends that same key on every retry. A till that sends a sale,
loses signal before the reply arrives and sends again gets back *the order the
server already made* — not a second one with the stock taken off twice.

The key is unique at the database on the server, so even two retries racing
each other cannot both get through.

## Why the sale is written down first

`enqueueSale` writes to the outbox and *then* tries to send — always, including
when the connection is perfect. If the app is killed between taking the money
and hearing back, the sale is still there.

## The three outcomes of a push

`pushSale` returns one of three, and telling them apart wrongly is how sales
get lost or doubled:

| | what it means | what happens |
|---|---|---|
| `synced` | the server has it | stop trying |
| `retry` | we could not ask, or it failed in a way that may pass later | stays `pending` |
| `rejected` | the server refused on the sale's own merits | parked for a person |

A `rejected` sale is never retried by the loop. The body would be identical and
so would the refusal; it needs someone to look at it. It is not dropped either.

## Order of operations

Sales up, then catalogue down. A sale exists only here; the catalogue can be
refetched forever. If the connection lasts for exactly one request, that
request should be a sale.

## The catalogue cursor

`pullCatalogue` asks for `?updated_since=` and moves the cursor only once a
page has actually been written. An interrupted sync re-reads that page rather
than skipping it — re-reading is harmless because the writes are upserts, and
skipping would leave the till selling at a price the shop has changed.

## Where this stops

Three things the till does **not** do offline, on purpose:

- **Coupons.** A usage-limited code cannot be checked without the server. The
  cart refuses coupons while offline rather than honouring one that has run
  out.
- **Opening and closing a shift.** The shift is the shop's cash reconciliation
  and belongs to the server.
- **Reports.** They read the whole dataset and are not useful from one device's
  slice of it.

## When the shelf and the till disagree

Two tills can sell the same last piece while both are offline. Neither is
wrong — each had the piece in hand. The server takes both sales, flags the
second with `offline_stock_conflict`, and the shop is told to count that shelf.
Stock never goes negative; the ledger clamps at zero and records what it could
actually take off, so the movement history stays honest.

This is the one place where offline-first costs something real, and it is the
same trade the shop already makes: the API has always let staff oversell,
because a cashier holding the garment is right and the count is wrong.
