<?php

namespace Tests\Feature;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An order is a receipt. It has to keep reading correctly after the catalogue
 * moves on — including after the product is deleted outright, which the bulk
 * actions in the admin panel make easy to do.
 */
class OrderHistorySurvivesTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Pink Dress',
            'name_ku' => 'کراسی پەمەیی',
            'name_ar' => 'فستان وردي',
            'price' => 25000,
        ], $attrs));
    }

    private function variation(Product $product): ProductVariation
    {
        return ProductVariation::create([
            'product_id' => $product->id,
            'color' => 'Pink',
            'size' => '2-3Y',
            'stock_quantity' => 10,
        ]);
    }

    public function test_an_order_line_records_what_was_sold(): void
    {
        $customer = User::factory()->create();
        $product = $this->product();
        $variation = $this->variation($product);

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [[
                'product_id' => $product->id,
                'product_variation_id' => $variation->id,
                'quantity' => 1,
            ]],
        ])->assertCreated();

        $line = OrderItem::first();
        $this->assertSame('Pink Dress', $line->product_name);
        $this->assertSame('کراسی پەمەیی', $line->product_name_ku);
        $this->assertSame('فستان وردي', $line->product_name_ar);
        $this->assertSame('Pink · 2-3Y', $line->variation_label);
    }

    public function test_the_name_survives_the_product_being_deleted(): void
    {
        $customer = User::factory()->create();
        $product = $this->product();
        $variation = $this->variation($product);

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [[
                'product_id' => $product->id,
                'product_variation_id' => $variation->id,
                'quantity' => 2,
            ]],
        ])->assertCreated();

        // An admin clears the product out of the catalogue.
        Sanctum::actingAs(User::factory()->create(['role' => Roles::ADMIN]));
        $this->postJson('/api/bulk/products', ['ids' => [$product->id]])->assertOk();
        $this->assertDatabaseMissing('products', ['id' => $product->id]);

        // The order still knows what it was for.
        $line = OrderItem::first();
        $this->assertNotNull($line, 'the order line should outlive the product');
        $this->assertSame('Pink Dress', $line->product_name);
        $this->assertSame('Pink · 2-3Y', $line->variation_label);
    }

    public function test_a_staff_quick_add_line_keeps_the_typed_name(): void
    {
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);

        $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [[
                'name' => 'Gift wrapping',
                'unit_price' => 2000,
                'quantity' => 1,
            ]],
        ])->assertCreated();

        $this->assertSame('Gift wrapping', OrderItem::first()->product_name);
    }
}
