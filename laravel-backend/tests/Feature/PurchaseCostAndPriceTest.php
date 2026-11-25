<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What a purchase does to a product's cost and price.
 */
class PurchaseCostAndPriceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Product $product;
    private ProductVariation $v;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 1]);
        $this->product = Product::create(['name' => 'Tee', 'price' => 20000, 'cost' => 12000, 'gender' => 0, 'is_active' => true]);
        $this->v = ProductVariation::create(['product_id' => $this->product->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 10, 'sku' => 'T-1']);
    }

    private function buy(int $qty, float $cost, ?float $retail = null): void
    {
        $this->actingAs($this->admin)->postJson('/api/purchases', [
            'supplier_name' => 'Supplier', 'purchase_date' => now()->toDateString(),
            'items' => [array_filter([
                'product_id' => $this->product->id, 'product_variation_id' => $this->v->id,
                'quantity' => $qty, 'cost_price' => $cost, 'retail_price' => $retail,
            ], fn ($x) => $x !== null)],
        ])->assertCreated();
    }

    public function test_the_cost_becomes_the_average_of_what_is_on_the_shelf_and_what_was_bought(): void
    {
        $this->buy(10, 14000);   // 10 already here at 12,000 + 10 new at 14,000

        $this->assertEquals(13000, $this->product->fresh()->cost);
        $this->assertSame(20, $this->v->fresh()->stock_quantity);
    }

    public function test_with_nothing_on_the_shelf_the_cost_is_simply_the_new_one(): void
    {
        $this->v->update(['stock_quantity' => 0]);
        $this->buy(5, 15000);

        $this->assertEquals(15000, $this->product->fresh()->cost);
    }

    public function test_the_average_counts_every_size_of_the_product(): void
    {
        ProductVariation::create(['product_id' => $this->product->id, 'color' => 'Red', 'size' => 'L', 'stock_quantity' => 10, 'sku' => 'T-2']);

        $this->buy(20, 14000);   // 20 on the shelf in all at 12,000 + 20 at 14,000

        $this->assertEquals(13000, $this->product->fresh()->cost);
    }

    public function test_a_cheaper_list_price_removes_a_discount_that_would_now_cost_more_than_it(): void
    {
        $this->product->update(['discount_price' => 18000]);

        $this->buy(1, 12000, 15000);   // list price drops to 15,000, below the 18,000 "discount"

        $fresh = $this->product->fresh();
        $this->assertEquals(15000, $fresh->price);
        $this->assertNull($fresh->discount_price);
    }

    public function test_editing_the_price_below_the_discount_is_refused_or_clears_it_never_charges_more(): void
    {
        $this->product->update(['discount_price' => 18000]);

        $this->actingAs($this->admin)->putJson("/api/products/{$this->product->id}", ['price' => 15000]);

        $fresh = $this->product->fresh();
        $discount = $fresh->discount_price;
        $this->assertTrue($discount === null || (float) $discount <= (float) $fresh->price, 'a discount must never exceed the list price');
    }
}
