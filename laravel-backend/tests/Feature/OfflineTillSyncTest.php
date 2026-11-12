<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What a till needs from the API when it has been selling without a signal.
 */
class OfflineTillSyncTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(): User
    {
        return User::factory()->create(['role' => Roles::CASHIER]);
    }

    private function variation(int $stock = 10): ProductVariation
    {
        $product = Product::create(['name' => 'Tee', 'price' => 10000, 'cost' => 4000, 'gender' => 0]);

        return $product->variations()->create([
            'color' => 'Red', 'size' => 'S', 'stock_quantity' => $stock,
        ]);
    }

    private function sale(array $extra = []): array
    {
        return array_merge([
            'items' => [['product_variation_id' => $this->variationId, 'quantity' => 1]],
            'payment_method' => 'cash',
            'channel' => 'pos',
        ], $extra);
    }

    private int $variationId;

    // ---- the same sale, sent twice -------------------------------------

    public function test_a_retried_sale_is_not_rung_up_again(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;
        $cashier = $this->cashier();

        // The till sends, loses signal before the answer, and sends again.
        $first = $this->actingAs($cashier)
            ->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-1-0001']))
            ->assertCreated()->json();

        $second = $this->actingAs($cashier)
            ->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-1-0001']))
            ->assertOk()->json();

        $this->assertSame($first['id'], $second['id'], 'the same order must come back, not a new one');
        $this->assertSame(1, Order::count());
        $this->assertSame(9, $variation->fresh()->stock_quantity, 'the stock must come off once');
    }

    public function test_two_different_sales_are_still_two_sales(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;
        $cashier = $this->cashier();

        $this->actingAs($cashier)->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-1-0001']))->assertCreated();
        $this->actingAs($cashier)->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-1-0002']))->assertCreated();

        $this->assertSame(2, Order::count());
        $this->assertSame(8, $variation->fresh()->stock_quantity);
    }

    public function test_a_shopper_cannot_claim_a_key(): void
    {
        // The key is a till's own bookkeeping. A customer sending one must not
        // be able to reserve it, nor to collide with a sale the shop made.
        $variation = $this->variation(10);
        $this->variationId = $variation->id;

        $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->postJson('/api/orders', $this->sale([
                'idempotency_key' => 'till-1-0001',
                'channel' => 'online',
                'governorate' => 'Erbil',
            ]))
            ->assertCreated();

        $this->assertNull(Order::first()->idempotency_key);
    }

    // ---- when the sale happened ----------------------------------------

    public function test_a_sale_lands_on_the_day_it_was_made(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;

        // Rung up on Tuesday, synced today. It belongs to Tuesday's takings:
        // landing it on today's meant the day's cash never matched the day's
        // report, and the shift it belonged to was already closed.
        $tuesday = now()->subDays(2)->setTime(14, 30);

        $order = $this->actingAs($this->cashier())
            ->postJson('/api/orders', $this->sale([
                'idempotency_key' => 'till-1-0003',
                'sold_at' => $tuesday->toIso8601String(),
            ]))
            ->assertCreated()->json();

        $this->assertSame(
            $tuesday->format('Y-m-d H:i'),
            Order::find($order['id'])->created_at->format('Y-m-d H:i')
        );
    }

    public function test_a_till_with_a_wrong_clock_cannot_rewrite_the_books(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;

        foreach ([now()->addDays(3), now()->subMonths(6)] as $impossible) {
            $order = $this->actingAs($this->cashier())
                ->postJson('/api/orders', $this->sale([
                    'idempotency_key' => 'k' . $impossible->timestamp,
                    'sold_at' => $impossible->toIso8601String(),
                ]))
                ->assertCreated()->json();

            $this->assertTrue(
                Order::find($order['id'])->created_at->diffInMinutes(now()) < 5,
                'an impossible time is ignored, not stored'
            );
        }
    }

    // ---- the number already on the receipt -----------------------------

    public function test_the_number_printed_on_the_receipt_is_kept(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;

        // The server's own number is built from the row id, which does not
        // exist until the row does — so an offline till printed its own.
        $order = $this->actingAs($this->cashier())
            ->postJson('/api/orders', $this->sale([
                'idempotency_key' => 'till-1-0004',
                'invoice_no' => 'POS1-20261112-0007',
            ]))
            ->assertCreated()->json();

        $this->assertSame('POS1-20261112-0007', Order::find($order['id'])->invoice_no);
    }

    public function test_a_number_another_order_already_has_falls_back(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;
        $cashier = $this->cashier();

        $this->actingAs($cashier)->postJson('/api/orders', $this->sale([
            'idempotency_key' => 'a', 'invoice_no' => 'POS1-20261112-0007',
        ]))->assertCreated();

        $second = $this->actingAs($cashier)->postJson('/api/orders', $this->sale([
            'idempotency_key' => 'b', 'invoice_no' => 'POS1-20261112-0007',
        ]))->assertCreated()->json();

        $invoice = Order::find($second['id'])->invoice_no;
        $this->assertNotSame('POS1-20261112-0007', $invoice, 'two orders cannot share a number');
        $this->assertStringStartsWith('INV-', $invoice);
    }

    // ---- when the shelf and the till disagree --------------------------

    public function test_a_sale_that_outran_its_stock_count_is_flagged_but_stands(): void
    {
        // Two tills sold the same last piece while both were offline.
        $variation = $this->variation(0);
        $this->variationId = $variation->id;

        $order = $this->actingAs($this->cashier())
            ->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-2-0001']))
            ->assertCreated()->json();

        // The sale stands and is recorded; the flag is how the shop is told
        // to go and count the shelf. Stock itself never goes negative — the
        // ledger clamps at zero and records what it could actually take off,
        // so the movement history stays honest about it.
        $this->assertTrue((bool) Order::find($order['id'])->offline_stock_conflict);
        $this->assertSame('delivered', Order::find($order['id'])->status, 'the sale is not blocked');
        $this->assertSame(0, $variation->fresh()->stock_quantity, 'stock does not go negative');

        $movement = \App\Models\StockMovement::where('order_id', $order['id'])->first();
        $this->assertSame(0, (int) $movement->quantity_change, 'the ledger records what it could take, not what was asked');
    }

    public function test_an_ordinary_sale_is_not_flagged(): void
    {
        $variation = $this->variation(10);
        $this->variationId = $variation->id;

        $order = $this->actingAs($this->cashier())
            ->postJson('/api/orders', $this->sale(['idempotency_key' => 'till-2-0002']))
            ->assertCreated()->json();

        $this->assertFalse((bool) Order::find($order['id'])->offline_stock_conflict);
    }

    // ---- syncing the catalogue -----------------------------------------

    public function test_the_till_can_ask_only_for_what_changed(): void
    {
        $old = Product::create(['name' => 'Old', 'price' => 1000, 'cost' => 1, 'gender' => 0]);
        $old->forceFill(['updated_at' => now()->subDays(5)])->saveQuietly();

        $mark = now()->subDay();

        $fresh = Product::create(['name' => 'Fresh', 'price' => 2000, 'cost' => 1, 'gender' => 0]);

        $names = array_column(
            $this->getJson('/api/products?updated_since=' . urlencode($mark->toIso8601String()))
                ->assertOk()->json(),
            'name'
        );

        $this->assertSame(['Fresh'], $names, 'only what moved since the till last synced');
        $this->assertNotNull($fresh->id);
    }

    public function test_a_nonsense_since_value_is_refused_rather_than_ignored(): void
    {
        // Ignoring it would hand back the whole catalogue and look like it
        // worked, so the till would never notice its sync was broken.
        $this->getJson('/api/products?updated_since=not-a-date')->assertStatus(422);
    }
}
