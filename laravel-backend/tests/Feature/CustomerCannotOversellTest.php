<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A shopper can never buy more than the shop has, however the order is built —
 * and is told exactly which item and how many are left.
 */
class CustomerCannotOversellTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private ProductVariation $v;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = User::factory()->create(['role' => 0]);
        $p = Product::create(['name' => 'Cord Trousers', 'name_ku' => 'پانتۆڵ', 'price' => 32000, 'cost' => 18000, 'gender' => 0, 'is_active' => true]);
        $this->v = ProductVariation::create(['product_id' => $p->id, 'color' => 'Beige', 'size' => '2-3', 'stock_quantity' => 1, 'sku' => 'C-1']);
    }

    private function order(array $lines)
    {
        return $this->actingAs($this->customer)->postJson('/api/orders', [
            'customer_name' => 'C', 'customer_phone' => '07501234567', 'shipping_address' => 'x', 'governorate' => 'Sulaymaniyah',
            'items' => array_map(fn ($l) => ['product_variation_id' => $this->v->id, 'quantity' => $l], $lines),
        ]);
    }

    public function test_asking_for_more_than_is_left_is_refused_and_says_what_is_left(): void
    {
        $r = $this->order([2])->assertStatus(422)->json();

        $this->assertSame('insufficient_stock', $r['code']);
        $this->assertSame('insufficient_stock', $r['error']);
        $this->assertSame(1, $r['available']);
        $this->assertSame(2, $r['requested']);
        $this->assertSame($this->v->id, $r['product_variation_id']);
        $this->assertStringContainsString('Cord Trousers', $r['message']);
        $this->assertSame('پانتۆڵ', $r['product_name_ku']);
        $this->assertSame(1, $this->v->fresh()->stock_quantity, 'a refused order takes nothing');
    }

    public function test_an_item_with_nothing_left_cannot_be_bought_at_all(): void
    {
        $this->v->update(['stock_quantity' => 0]);

        $r = $this->order([1])->assertStatus(422)->json();

        $this->assertSame(0, $r['available']);
    }

    public function test_splitting_the_same_size_over_two_lines_does_not_get_around_the_limit(): void
    {
        $this->v->update(['stock_quantity' => 4]);

        // 3 + 3 = 6 against 4 in stock: each line alone is fine.
        $this->order([3, 3])->assertStatus(422);

        $this->assertSame(4, $this->v->fresh()->stock_quantity);
        $this->assertSame(0, \App\Models\Order::count());
    }

    public function test_exactly_what_is_left_can_be_bought(): void
    {
        $this->order([1])->assertCreated();

        $this->assertSame(0, $this->v->fresh()->stock_quantity);
    }
}
