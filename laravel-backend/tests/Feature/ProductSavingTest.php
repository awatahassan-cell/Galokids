<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Saving a product from the panel.
 *
 * Every case here is a save the shop made and believed had worked. The panel
 * added the product to the screen, announced "added successfully" and threw the
 * server's refusal away, so the product was gone on the next reload with no
 * explanation. These make the API answer properly; the panel now waits for that
 * answer before it congratulates anyone.
 */
class ProductSavingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    public function test_a_product_saves_with_the_optional_boxes_left_empty(): void
    {
        // An untouched box arrives as "", which the framework turns into null.
        // `gender` and `cost` are NOT NULL columns, so the insert died on a
        // constraint and the shop got a 500 for a form it had filled in.
        $this->actingAs($this->admin())
            ->postJson('/api/products', [
                'name' => 'Kids Tee',
                'price' => 33000,
                'cost' => '',
                'gender' => '',
                'category_id' => '',
                'discount_price' => '',
                'sku' => '',
            ])
            ->assertCreated();

        $product = Product::firstWhere('name', 'Kids Tee');
        $this->assertNotNull($product, 'the product should be in the database, not just on screen');
        $this->assertSame(0, (int) $product->gender);
        $this->assertSame(0.0, (float) $product->cost);
    }

    public function test_the_discount_can_be_edited_without_resending_the_price(): void
    {
        $category = Category::create(['name' => 'Shirts']);
        $product = Product::create([
            'name' => 'Jacket',
            'price' => 5000,
            'cost' => 1000,
            'gender' => 0,
            'category_id' => $category->id,
        ]);

        // `lte:price` read the other side out of the request, which carries no
        // price here — so a 100 discount on a 5,000 product was refused as
        // "must be less than or equal to price".
        $this->actingAs($this->admin())
            ->putJson("/api/products/{$product->id}", ['discount_price' => 100])
            ->assertOk();

        $this->assertSame(100.0, (float) $product->fresh()->discount_price);
    }

    public function test_a_discount_above_the_stored_price_is_still_refused(): void
    {
        $product = Product::create(['name' => 'Jacket', 'price' => 5000, 'cost' => 1000, 'gender' => 0]);

        $this->actingAs($this->admin())
            ->putJson("/api/products/{$product->id}", ['discount_price' => 99999])
            ->assertStatus(422);

        $this->assertNull($product->fresh()->discount_price);
    }

    public function test_a_discount_above_the_price_being_set_is_refused(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/products', [
                'name' => 'Upside down',
                'price' => 1000,
                'discount_price' => 2000,
                'cost' => 10,
                'gender' => 0,
            ])
            ->assertStatus(422);

        $this->assertSame(0, Product::count());
    }
}
