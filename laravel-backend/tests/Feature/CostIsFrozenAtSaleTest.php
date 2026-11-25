<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Profit on a sale is fixed on the day of the sale.
 *
 * Cost of goods was read from the product's CURRENT cost every time a report
 * ran. Restocking at a higher price, or correcting a typo in the cost, quietly
 * rewrote the profit of everything sold before it — last month's report
 * changed on its own.
 */
class CostIsFrozenAtSaleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Product $product;
    private ProductVariation $variation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 1]);
        $this->product = Product::create(['name' => 'Tee', 'price' => 20000, 'cost' => 12000, 'gender' => 0, 'is_active' => true]);
        $this->variation = ProductVariation::create(['product_id' => $this->product->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 50, 'sku' => 'T-1']);
    }

    private function sell(int $qty): array
    {
        return $this->actingAs($this->admin)->postJson('/api/orders', [
            'channel' => 'pos', 'payment_method' => 'cash',
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => $qty]],
        ])->assertCreated()->json();
    }

    private function sales(): array
    {
        return $this->actingAs($this->admin)->getJson('/api/reports/sales')->assertOk()->json();
    }

    public function test_changing_a_products_cost_later_does_not_change_profit_already_made(): void
    {
        $this->sell(2);                                              // 2 × 12,000 = 24,000 cost
        $this->assertEquals(24000, $this->sales()['cogs']);

        $this->product->update(['cost' => 15000]);                  // supplier raised the price

        $this->assertEquals(24000, $this->sales()['cogs'], 'yesterday\'s profit must not move');
        $this->assertEquals(16000, $this->sales()['gross_profit']); // 40,000 − 24,000
    }

    public function test_a_sale_after_the_change_uses_the_new_cost(): void
    {
        $this->sell(1);                                              // 12,000
        $this->product->update(['cost' => 15000]);
        $this->sell(1);                                              // 15,000

        $this->assertEquals(27000, $this->sales()['cogs']);
    }

    public function test_the_daily_report_freezes_cost_the_same_way(): void
    {
        $this->sell(2);
        $this->product->update(['cost' => 15000]);

        $this->assertEquals(24000, $this->actingAs($this->admin)->getJson('/api/reports/daily')->json('totals.cogs'));
    }

    public function test_a_returned_piece_gives_back_the_cost_it_was_sold_at(): void
    {
        $order = $this->sell(2);
        $this->product->update(['cost' => 15000]);
        $this->actingAs($this->admin)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $this->assertEquals(12000, $this->sales()['cogs']);          // one piece stayed sold, at 12,000
    }

    public function test_an_old_order_with_no_recorded_cost_falls_back_to_the_product_cost(): void
    {
        $order = $this->sell(1);
        \App\Models\OrderItem::where('order_id', $order['id'])->update(['unit_cost' => null]);   // sold before costs were kept

        $this->assertEquals(12000, $this->sales()['cogs']);
    }

    public function test_a_customer_never_sees_what_the_shop_paid(): void
    {
        $customer = User::factory()->create(['role' => 0]);
        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'customer_name' => 'C', 'customer_phone' => '07501234567', 'shipping_address' => 'x', 'governorate' => 'Sulaymaniyah',
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->assertArrayNotHasKey('unit_cost', $order['items'][0]);
        $this->assertArrayNotHasKey('cost', $order['items'][0]['product'] ?? []);

        $mine = $this->actingAs($customer)->getJson('/api/orders?mine=1')->assertOk()->json();
        $rows = $mine['data'] ?? $mine;
        $this->assertStringNotContainsString('unit_cost', json_encode($rows));
    }
}
