<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\CashMovement;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;
    private ProductVariation $variation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->product = Product::create(['name' => 'Shirt', 'price' => 10000, 'cost' => 4000]);
        $this->variation = ProductVariation::create([
            'product_id' => $this->product->id,
            'color' => 'Red', 'size' => 'M', 'stock_quantity' => 20,
        ]);
    }

    /* ---------------------------------------------------------- stock ---- */

    public function test_a_sale_writes_a_stock_movement(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 3]],
        ])->assertCreated();

        $movement = StockMovement::latest('id')->first();

        $this->assertNotNull($movement);
        $this->assertSame(StockMovement::TYPE_SALE, $movement->type);
        $this->assertSame(-3, $movement->quantity_change);
        $this->assertSame(17, $movement->quantity_after);
    }

    public function test_a_refund_writes_a_stock_movement_back(): void
    {
        $cashier = User::factory()->cashier()->create();

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $this->assertSame(1, StockMovement::where('type', StockMovement::TYPE_REFUND)->count());
        $this->assertSame(20, (int) $this->variation->fresh()->stock_quantity);
    }

    public function test_a_manual_correction_is_recorded_with_its_reason(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/stock-movements', [
            'product_variation_id' => $this->variation->id,
            'counted_quantity' => 18,
            'note' => 'Stock take: two damaged',
        ])->assertCreated();

        $movement = StockMovement::latest('id')->first();

        $this->assertSame(-2, $movement->quantity_change);
        $this->assertSame(18, $movement->quantity_after);
        $this->assertSame('Stock take: two damaged', $movement->note);
        $this->assertSame(18, (int) $this->variation->fresh()->stock_quantity);
    }

    public function test_a_customer_cannot_read_or_write_the_stock_ledger(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/stock-movements')->assertForbidden();
        $this->actingAs($customer)->postJson('/api/stock-movements', [
            'product_variation_id' => $this->variation->id,
            'counted_quantity' => 999,
            'note' => 'nope',
        ])->assertForbidden();
    }

    /* ------------------------------------------------------- shipping ---- */

    public function test_delivery_is_charged_by_governorate_on_web_orders(): void
    {
        Setting::create(['key' => 'shipping_rates', 'value' => json_encode(['Erbil' => 5000, 'Basra' => 9000])]);
        Setting::create(['key' => 'shipping_default_fee', 'value' => '7000']);

        $customer = User::factory()->create();

        $erbil = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $this->assertSame(5000.0, (float) $erbil['shipping_fee']);
        $this->assertSame(15000.0, (float) $erbil['total_amount']);

        // Somewhere without its own rate falls back to the default.
        $other = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'governorate' => 'Duhok',
        ])->assertCreated()->json();

        $this->assertSame(7000.0, (float) $other['shipping_fee']);
    }

    public function test_delivery_is_free_above_the_threshold_and_never_charged_at_the_till(): void
    {
        Setting::create(['key' => 'shipping_default_fee', 'value' => '5000']);
        Setting::create(['key' => 'shipping_free_over', 'value' => '50000']);

        $customer = User::factory()->create();
        $big = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 6]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $this->assertSame(0.0, (float) $big['shipping_fee']);

        // A walk-in customer carries the bag home.
        $cashier = User::factory()->cashier()->create();
        $pos = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->assertSame(0.0, (float) $pos['shipping_fee']);
    }

    public function test_the_shipping_quote_matches_what_the_order_charges(): void
    {
        Setting::create(['key' => 'shipping_rates', 'value' => json_encode(['Erbil' => 5000])]);

        $this->getJson('/api/shipping/quote?governorate=Erbil&subtotal=10000')
            ->assertOk()
            ->assertJson(['fee' => 5000]);
    }

    /* --------------------------------------------------- status + SMS ---- */

    public function test_a_status_change_is_recorded_in_the_order_history(): void
    {
        $cashier = User::factory()->cashier()->create();
        $customer = User::factory()->create();

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", [
            'status' => 'shipped',
            'note' => 'Handed to the driver',
        ])->assertOk();

        $history = OrderStatusHistory::where('order_id', $order['id'])->orderBy('id')->get();

        $this->assertCount(2, $history);           // created + shipped
        $this->assertSame('pending', $history[1]->from_status);
        $this->assertSame('shipped', $history[1]->to_status);
        $this->assertSame('Handed to the driver', $history[1]->note);

        $this->actingAs($cashier)->getJson("/api/orders/{$order['id']}/history")
            ->assertOk()->assertJsonCount(2);
    }

    /* ------------------------------------------------------- cash box ---- */

    public function test_cash_taken_out_of_the_drawer_lowers_the_expected_count(): void
    {
        $cashier = User::factory()->cashier()->create();

        $this->actingAs($cashier)->postJson('/api/shifts/open', ['opening_float' => 50000])->assertCreated();

        $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated();

        // Paid the delivery driver out of the till.
        $this->actingAs($cashier)->postJson('/api/shifts/cash', [
            'direction' => 'out', 'amount' => 15000, 'reason' => 'Paid the driver',
        ])->assertCreated();

        $summary = $this->actingAs($cashier)->getJson('/api/shifts/report')->assertOk()->json('summary');

        // 50,000 float + 10,000 sale − 15,000 out.
        $this->assertSame(45000.0, (float) $summary['expected_cash']);
        $this->assertSame(15000.0, (float) $summary['cash_out']);
        $this->assertSame(1, CashMovement::count());
    }

    public function test_cash_movements_need_an_open_shift(): void
    {
        $cashier = User::factory()->cashier()->create();

        $this->actingAs($cashier)->postJson('/api/shifts/cash', [
            'direction' => 'out', 'amount' => 1000, 'reason' => 'test',
        ])->assertStatus(422);
    }

    /* --------------------------------------------------- activity log ---- */

    public function test_price_edits_and_deletions_are_recorded(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->putJson("/api/products/{$this->product->id}", [
            'name' => 'Shirt', 'price' => 12000,
        ])->assertOk();

        $log = ActivityLog::where('action', 'product.updated')->latest('id')->first();

        $this->assertNotNull($log);
        $this->assertSame([10000, 12000], array_map('intval', $log->changes['price']));
        $this->assertSame($admin->id, $log->user_id);
    }

    public function test_only_an_admin_can_read_the_activity_trail(): void
    {
        $this->actingAs(User::factory()->cashier()->create())
            ->getJson('/api/activity-logs')->assertForbidden();

        $this->actingAs(User::factory()->admin()->create())
            ->getJson('/api/activity-logs')->assertOk();
    }

    /* ---------------------------------------------------------- swap ----- */

    public function test_an_exchange_returns_one_item_and_issues_another(): void
    {
        $cashier = User::factory()->cashier()->create();

        $large = ProductVariation::create([
            'product_id' => $this->product->id,
            'color' => 'Red', 'size' => 'L', 'stock_quantity' => 5,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $result = $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/exchange", [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $large->id, 'quantity' => 1]],
            'reason' => 'Wrong size',
        ])->assertCreated()->json();

        // Same price both ways, so nothing changes hands.
        $this->assertSame(10000.0, (float) $result['returned_value']);
        $this->assertSame(10000.0, (float) $result['new_value']);
        $this->assertSame(0.0, (float) $result['difference']);

        // Stock followed the swap.
        $this->assertSame(20, (int) $this->variation->fresh()->stock_quantity);
        $this->assertSame(4, (int) $large->fresh()->stock_quantity);

        $this->assertStringStartsWith('EXC-', $result['replacement_order']['invoice_no']);
    }

    public function test_an_exchange_for_a_dearer_item_asks_for_the_difference(): void
    {
        $cashier = User::factory()->cashier()->create();

        $jacket = Product::create(['name' => 'Jacket', 'price' => 25000, 'cost' => 9000]);
        $jacketVariation = ProductVariation::create([
            'product_id' => $jacket->id, 'color' => 'Blue', 'size' => 'M', 'stock_quantity' => 5,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $result = $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/exchange", [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $jacketVariation->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        // 25,000 out, 10,000 back: the customer owes 15,000.
        $this->assertSame(15000.0, (float) $result['difference']);
    }

    public function test_the_same_item_cannot_be_exchanged_twice(): void
    {
        $cashier = User::factory()->cashier()->create();
        $large = ProductVariation::create([
            'product_id' => $this->product->id, 'color' => 'Red', 'size' => 'L', 'stock_quantity' => 5,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $payload = [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $large->id, 'quantity' => 1]],
        ];

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/exchange", $payload)->assertCreated();
        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/exchange", $payload)->assertStatus(422);
    }

    public function test_a_customer_cannot_run_an_exchange(): void
    {
        $customer = User::factory()->create();

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->actingAs($customer)->postJson("/api/orders/{$order['id']}/exchange", [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
        ])->assertForbidden();
    }
}
