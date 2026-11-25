<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stock must come out right however an order ends up: sold, partly returned,
 * then cancelled, reopened or deleted. A unit is either on the shelf or with
 * a customer; none may be created or lost on the way.
 */
class StockAfterPartialReturnTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private ProductVariation $v;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 1]);
        $p = Product::create(['name' => 'Tee', 'price' => 20000, 'cost' => 12000, 'gender' => 0, 'is_active' => true]);
        $this->v = ProductVariation::create(['product_id' => $p->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 20, 'sku' => 'T-1']);
    }

    private function soldThree(): array
    {
        return $this->actingAs($this->admin)->postJson('/api/orders', [
            'channel' => 'online', 'customer_name' => 'C', 'customer_phone' => '07501234567', 'shipping_address' => 'x', 'shipping_fee' => 0,
            'items' => [['product_variation_id' => $this->v->id, 'quantity' => 3]],
        ])->assertCreated()->json();
    }

    private function returnOne(array $order): void
    {
        $this->actingAs($this->admin)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();
    }

    private function stock(): int
    {
        return $this->v->fresh()->stock_quantity;
    }

    public function test_cancelling_after_a_partial_return_puts_back_only_what_is_still_out(): void
    {
        $order = $this->soldThree();          // 20 → 17
        $this->returnOne($order);              // 17 → 18  (one unit came back)

        $this->actingAs($this->admin)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();

        // The other two are no longer with a customer: all 20 are on the shelf.
        $this->assertSame(20, $this->stock());
    }

    public function test_reopening_after_that_takes_only_the_two_that_go_out_again(): void
    {
        $order = $this->soldThree();
        $this->returnOne($order);
        $put = fn (string $status) => $this->actingAs($this->admin)->putJson("/api/orders/{$order['id']}", ['status' => $status])->assertOk();

        $put('cancelled');                    // 20
        $put('pending');                      // two go out again
        $this->assertSame(18, $this->stock());
    }

    public function test_deleting_after_a_partial_return_does_not_restock_the_returned_unit_twice(): void
    {
        $order = $this->soldThree();          // 17
        $this->returnOne($order);              // 18

        $this->actingAs($this->admin)->deleteJson("/api/orders/{$order['id']}")->assertOk();

        // Two were still with the customer and are put back: 20, not 21.
        $this->assertSame(20, $this->stock());
    }

    public function test_the_ledger_always_explains_the_shelf(): void
    {
        $order = $this->soldThree();
        $this->returnOne($order);
        $this->actingAs($this->admin)->putJson("/api/orders/{$order['id']}", ['status' => 'cancelled'])->assertOk();
        $this->actingAs($this->admin)->putJson("/api/orders/{$order['id']}", ['status' => 'pending'])->assertOk();
        $this->actingAs($this->admin)->deleteJson("/api/orders/{$order['id']}")->assertOk();

        $moved = (int) StockMovement::where('product_variation_id', $this->v->id)->sum('quantity_change');
        $this->assertSame($this->stock(), 20 + $moved);
        $this->assertSame(20, $this->stock());
    }
}
