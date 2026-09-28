<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Setting;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Returns and cancellations.
 *
 * These two are the money-losing pair: a refund that pays back more than was
 * taken, and a cancellation that never puts the stock back. Both are quiet —
 * the order looks fine afterwards — so they need tests rather than a glance.
 */
class ReturnsAndCancellationsTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Pink Dress', 'price' => 25000, 'cost' => 12000,
        ], $attrs));
    }

    private function variation(Product $p, int $stock = 10): ProductVariation
    {
        return ProductVariation::create([
            'product_id' => $p->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => $stock,
        ]);
    }

    private function cashier(): User
    {
        return User::factory()->create(['role' => Roles::CASHIER]);
    }

    /* ------------------------------------------------- refund amounts --- */

    public function test_a_refund_does_not_hand_back_the_delivery_fee(): void
    {
        // Delivery is charged on top of the goods, and it is not part of what
        // the items cost. Refunding an item must return the item's price.
        Setting::updateOrCreate(['key' => 'shipping_default_fee'], ['value' => '5000']);
        Setting::updateOrCreate(['key' => 'shipping_free_over'], ['value' => '0']);

        $customer = User::factory()->create();
        $product = $this->product(['price' => 25000]);
        $variation = $this->variation($product);

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $shipping = (float) $order['shipping_fee'];
        $this->assertGreaterThan(0, $shipping, 'this test needs an order that was charged for delivery');
        $this->assertSame(25000.0 + $shipping, (float) $order['total_amount']);

        $refund = $this->actingAs($this->cashier())
            ->postJson("/api/orders/{$order['id']}/refund", [
                'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            ])->assertCreated()->json();

        $this->assertSame(
            25000.0,
            (float) $refund['refund']['amount'],
            'the delivery fee must not be paid back as part of an item refund'
        );
    }

    public function test_returning_every_item_marks_the_order_returned(): void
    {
        Setting::updateOrCreate(['key' => 'shipping_default_fee'], ['value' => '5000']);
        Setting::updateOrCreate(['key' => 'shipping_free_over'], ['value' => '0']);

        $customer = User::factory()->create();
        $variation = $this->variation($this->product(['price' => 25000]));

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $this->actingAs($this->cashier())
            ->postJson("/api/orders/{$order['id']}/refund", [
                'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
            ])->assertCreated();

        $fresh = Order::find($order['id']);
        $this->assertSame('returned', $fresh->status, 'every item came back, so the order is a return');
    }

    public function test_a_partial_return_leaves_the_order_open(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 10000]));

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $fresh = Order::find($order['id']);
        $this->assertNotSame('returned', $fresh->status, 'two of three items are still with the customer');
        $this->assertSame(10000.0, (float) $fresh->refunded_amount);
    }

    /* --------------------------------------------------- cancellation --- */

    public function test_cancelling_an_order_puts_the_stock_back(): void
    {
        $cashier = $this->cashier();
        $product = $this->product();
        $variation = $this->variation($product, 10);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->assertSame(7, $variation->fresh()->stock_quantity, 'the sale should have taken three');

        $this->actingAs($cashier)
            ->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])
            ->assertOk();

        $this->assertSame(
            10,
            $variation->fresh()->stock_quantity,
            'a cancelled order was never handed over, so its stock belongs back on the shelf'
        );
    }

    public function test_cancelling_twice_does_not_restock_twice(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(), 10);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();
        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();

        $this->assertSame(10, $variation->fresh()->stock_quantity);
    }

    public function test_reopening_a_cancelled_order_takes_the_stock_again(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(), 10);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();
        $this->assertSame(10, $variation->fresh()->stock_quantity);

        // Cancelled by mistake: putting it back to pending owes the stock again.
        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", ['status' => 'pending'])->assertOk();
        $this->assertSame(8, $variation->fresh()->stock_quantity);
    }

    public function test_deleting_a_cancelled_order_does_not_restock_a_second_time(): void
    {
        // About the stock arithmetic, not about who may delete: removing an
        // order from the database needs orders.delete, which no cashier holds
        // by default.
        $cashier = $this->cashier();
        $cashier->forceFill(['permissions' => ['pos.access', 'orders.view', 'orders.manage', 'orders.delete']])->save();
        $variation = $this->variation($this->product(), 10);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 4]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();
        $this->assertSame(10, $variation->fresh()->stock_quantity);

        $this->actingAs($cashier)->deleteJson("/api/orders/{$order['id']}")->assertOk();
        $this->assertSame(10, $variation->fresh()->stock_quantity, 'the cancel already restocked it');
    }

    public function test_cancelling_in_bulk_also_puts_the_stock_back(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(), 10);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->assertSame(7, $variation->fresh()->stock_quantity);

        $this->actingAs(User::factory()->create(['role' => Roles::ADMIN]))
            ->postJson('/api/bulk/orders/status', [
                'ids' => [$order['id']],
                'status' => 'cancelled',
            ])->assertOk();

        $this->assertSame(
            10,
            $variation->fresh()->stock_quantity,
            'cancelling in bulk must behave the same as cancelling one order'
        );
    }

    /* ------------------------------------------------------- exchanges --- */

    public function test_exchanging_the_whole_receipt_records_a_return_not_a_cancellation(): void
    {
        $cashier = $this->cashier();
        $small = $this->variation($this->product(['price' => 15000]));
        $large = $this->variation($this->product(['price' => 15000]));

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $small->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/exchange", [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $large->id, 'quantity' => 1]],
        ])->assertCreated();

        $fresh = Order::find($order['id']);
        $this->assertSame('returned', $fresh->status, 'the original receipt came back over the counter');
    }

    /* ------------------------------------------------ what the tables see --- */

    public function test_an_order_reports_how_much_of_it_came_back(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 10000]));

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 5]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $shown = $this->actingAs($cashier)->getJson("/api/orders/{$order['id']}")->assertOk()->json();

        $this->assertSame(2, $shown['returned_quantity'], 'two of the five came back');
        $this->assertSame(5, $shown['total_quantity']);
        $this->assertFalse($shown['fully_returned']);
    }

    public function test_a_full_return_is_reported_as_full(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 10000]));

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $shown = $this->actingAs($cashier)->getJson("/api/orders/{$order['id']}")->assertOk()->json();
        $this->assertSame(2, $shown['returned_quantity']);
        $this->assertTrue($shown['fully_returned']);
    }

    public function test_a_receipt_says_which_of_its_lines_came_back(): void
    {
        // "All of it or just some of it" is a per-line question once a receipt
        // has more than one product on it.
        $cashier = $this->cashier();
        $shoes = $this->variation($this->product(['name' => 'Shoes', 'price' => 20000]));
        $hat   = $this->variation($this->product(['name' => 'Hat', 'price' => 5000]));

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [
                ['product_variation_id' => $shoes->id, 'quantity' => 2],
                ['product_variation_id' => $hat->id, 'quantity' => 1],
            ],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $shoesLine = collect($order['items'])->firstWhere('product_variation_id', $shoes->id);
        $hatLine   = collect($order['items'])->firstWhere('product_variation_id', $hat->id);

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $shoesLine['id'], 'quantity' => 1]],
        ])->assertCreated();

        $shown = $this->actingAs($cashier)->getJson("/api/orders/{$order['id']}")->assertOk()->json();
        $lines = collect($shown['items'])->keyBy('id');

        $this->assertSame(1, $lines[$shoesLine['id']]['returned_quantity'], 'one of the two pairs came back');
        $this->assertSame(0, $lines[$hatLine['id']]['returned_quantity'], 'the hat was kept');
        $this->assertSame(1, $shown['returned_quantity']);
        $this->assertSame(3, $shown['total_quantity']);
        $this->assertFalse($shown['fully_returned']);

        // The list endpoint carries the same per-line detail, so the admin table
        // does not have to open every order to find out.
        $listed = collect($this->actingAs($cashier)->getJson('/api/orders')->assertOk()->json('data'))
            ->firstWhere('id', $order['id']);
        $this->assertSame(
            1,
            collect($listed['items'])->firstWhere('id', $shoesLine['id'])['returned_quantity']
        );
    }
}
