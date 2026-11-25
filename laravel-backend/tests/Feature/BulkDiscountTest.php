<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * One percentage off the catalogue: what it changes, what it must not, and
 * that a customer is then really charged the new price.
 */
class BulkDiscountTest extends TestCase
{
    use RefreshDatabase;

    private function product(string $name, float $price, array $extra = []): Product
    {
        $product = Product::create(array_merge(['name' => $name, 'price' => $price, 'gender' => 0, 'is_active' => true], $extra));
        ProductVariation::create(['product_id' => $product->id, 'color' => 'Red', 'size' => '4-5', 'stock_quantity' => 5, 'sku' => 'S-' . $product->id]);

        return $product;
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 1]);
    }

    public function test_percent_off_everything_rounds_to_a_price_a_shop_would_write(): void
    {
        $a = $this->product('A', 35000);   // 20% → 28000
        $b = $this->product('B', 18000);   // 20% → 14400 → nearest 250 = 14500
        $c = $this->product('C', 48000);   // 20% → 38400 → 38500

        $r = $this->actingAs($this->admin())
            ->postJson('/api/products/bulk-discount', ['percent' => 20, 'scope' => 'all'])
            ->assertOk()->json();

        $this->assertSame(3, $r['affected']);
        $this->assertEquals(28000, $a->fresh()->discount_price);
        $this->assertEquals(14500, $b->fresh()->discount_price);
        $this->assertEquals(38500, $c->fresh()->discount_price);
        // The list price is never touched.
        $this->assertEquals(35000, $a->fresh()->price);
    }

    public function test_a_preview_changes_nothing_but_reports_what_would_happen(): void
    {
        $a = $this->product('A', 35000);

        $r = $this->actingAs($this->admin())
            ->postJson('/api/products/bulk-discount', ['percent' => 30, 'scope' => 'all', 'dry_run' => true])
            ->assertOk()->json();

        $this->assertTrue($r['dry_run']);
        $this->assertSame(1, $r['affected']);
        $this->assertEquals(24500, $r['samples'][0]['new_discount_price']);
        $this->assertNull($a->fresh()->discount_price);
    }

    public function test_it_can_be_limited_to_one_section_or_to_chosen_products(): void
    {
        $girls = Category::create(['name' => 'Girls', 'slug' => 'girls']);
        $boys = Category::create(['name' => 'Boys', 'slug' => 'boys']);
        $dress = $this->product('Dress', 40000, ['category_id' => $girls->id]);
        $tee = $this->product('Tee', 20000, ['category_id' => $boys->id]);
        $cap = $this->product('Cap', 10000, ['category_id' => $boys->id]);

        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/api/products/bulk-discount', ['percent' => 50, 'scope' => 'category', 'category_id' => $girls->id])->assertOk();
        $this->assertEquals(20000, $dress->fresh()->discount_price);
        $this->assertNull($tee->fresh()->discount_price);

        $this->actingAs($admin)->postJson('/api/products/bulk-discount', ['percent' => 50, 'scope' => 'ids', 'ids' => [$cap->id]])->assertOk();
        $this->assertEquals(5000, $cap->fresh()->discount_price);
        $this->assertNull($tee->fresh()->discount_price);
    }

    public function test_hand_set_discounts_can_be_kept(): void
    {
        $custom = $this->product('Custom', 30000, ['discount_price' => 25000]);
        $plain = $this->product('Plain', 30000);

        $r = $this->actingAs($this->admin())
            ->postJson('/api/products/bulk-discount', ['percent' => 30, 'scope' => 'all', 'keep_existing' => true])
            ->assertOk()->json();

        $this->assertSame(1, $r['skipped_existing']);
        $this->assertEquals(25000, $custom->fresh()->discount_price);
        $this->assertEquals(21000, $plain->fresh()->discount_price);
    }

    public function test_it_warns_when_a_price_would_fall_below_cost_and_reports_own_variation_prices(): void
    {
        $p = $this->product('Thin margin', 20000, ['cost' => 17000]);
        ProductVariation::where('product_id', $p->id)->update(['price_override' => 19000]);

        $r = $this->actingAs($this->admin())
            ->postJson('/api/products/bulk-discount', ['percent' => 30, 'scope' => 'all', 'dry_run' => true])
            ->assertOk()->json();

        $this->assertSame(1, $r['below_cost']);
        // That variation keeps its own price at checkout, so it is not pretended reduced.
        $this->assertSame(1, $r['variations_with_own_price']);
    }

    public function test_zero_percent_takes_the_discounts_off_again(): void
    {
        $a = $this->product('A', 35000, ['discount_price' => 28000]);
        $b = $this->product('B', 20000);

        $r = $this->actingAs($this->admin())
            ->postJson('/api/products/bulk-discount', ['percent' => 0, 'scope' => 'all'])
            ->assertOk()->json();

        $this->assertSame(1, $r['affected']);
        $this->assertNull($a->fresh()->discount_price);
        $this->assertNull($b->fresh()->discount_price);
    }

    public function test_a_customer_is_then_charged_the_discounted_price_and_stock_still_drops(): void
    {
        $p = $this->product('Dress', 40000);
        $v = $p->variations()->first();
        $this->actingAs($this->admin())->postJson('/api/products/bulk-discount', ['percent' => 25, 'scope' => 'all'])->assertOk();

        $customer = User::factory()->create(['role' => 0]);
        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'customer_name' => 'C', 'customer_phone' => '07501234567', 'shipping_address' => 'x', 'governorate' => 'Sulaymaniyah',
            'items' => [['product_variation_id' => $v->id, 'quantity' => 2]],
        ])->assertCreated()->json();

        $this->assertEquals(60000, $order['subtotal']);   // 2 × 30000, not 2 × 40000
        $this->assertSame(3, $v->fresh()->stock_quantity);
    }

    public function test_percent_is_bounded_and_only_product_managers_may_use_it(): void
    {
        $this->product('A', 10000);
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/products/bulk-discount', ['percent' => 95, 'scope' => 'all'])->assertStatus(422);
        $this->actingAs($admin)->postJson('/api/products/bulk-discount', ['percent' => 20, 'scope' => 'category'])->assertStatus(422);

        $this->actingAs(User::factory()->create(['role' => 0]))
            ->postJson('/api/products/bulk-discount', ['percent' => 20, 'scope' => 'all'])->assertForbidden();
    }
}
