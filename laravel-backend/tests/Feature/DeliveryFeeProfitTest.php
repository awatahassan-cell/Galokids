<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The delivery fee is the courier's money, not the shop's profit.
 *
 * A 22,000 order with 4,000 delivery used to report 22,000 of revenue against
 * 18,000 of goods, so every delivered order overstated profit by its fee.
 */
class DeliveryFeeProfitTest extends TestCase
{
    use RefreshDatabase;

    private function sale(User $admin, string $channel, int $qty = 1): array
    {
        $product = Product::create(['name' => 'Tee ' . uniqid(), 'price' => 18000, 'cost' => 10000, 'gender' => 0, 'is_active' => true]);
        $variation = ProductVariation::create(['product_id' => $product->id, 'color' => 'Red', 'size' => '4-5', 'stock_quantity' => 9, 'sku' => 'S-' . $product->id]);

        return $this->actingAs($admin)->postJson('/api/orders', [
            'channel' => $channel, 'customer_name' => 'C', 'customer_phone' => '07501234567',
            'shipping_address' => 'x', 'governorate' => 'Sulaymaniyah',
            // A till sale carries no delivery; the others charge 4,000.
            'shipping_fee' => $channel === 'pos' ? 0 : 4000,
            'items' => [['product_variation_id' => $variation->id, 'quantity' => $qty]],
        ])->assertCreated()->json();
    }

    public function test_the_delivery_fee_is_not_revenue_or_profit_but_is_reported_on_its_own(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $order = $this->sale($admin, 'online');

        $this->assertEquals(4000, $order['shipping_fee']);
        $this->assertEquals(22000, $order['total_amount']);   // the customer still pays it

        $r = $this->actingAs($admin)->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertEquals(18000, $r['revenue']);            // goods only
        $this->assertEquals(4000, $r['delivery_fees']);
        $this->assertEquals(10000, $r['cogs']);
        $this->assertEquals(8000, $r['gross_profit']);        // 18000 − 10000, not 12000
        $this->assertEquals(18000, $r['online_revenue']);
    }

    public function test_a_refund_comes_off_the_goods_not_the_delivery(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $order = $this->sale($admin, 'social', 2);             // 2 × 18000 + 4000 delivery

        $this->actingAs($admin)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $r = $this->actingAs($admin)->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertEquals(18000, $r['revenue']);             // one piece kept
        $this->assertEquals(4000, $r['delivery_fees']);
        $this->assertEquals(8000, $r['gross_profit']);
    }

    public function test_the_calendar_and_cashier_reports_agree_with_the_sales_report(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $this->sale($admin, 'online');
        $this->sale($admin, 'pos');                            // a till sale carries no delivery

        $sales = $this->actingAs($admin)->getJson('/api/reports/sales')->json();
        $daily = $this->actingAs($admin)->getJson('/api/reports/daily')->assertOk()->json();
        $cashiers = $this->actingAs($admin)->getJson('/api/reports/cashiers')->assertOk()->json();

        $this->assertEquals(36000, $sales['revenue']);
        $this->assertEquals($sales['revenue'], $daily['totals']['revenue']);
        $this->assertEquals(4000, $daily['totals']['delivery_fees']);
        $this->assertEquals($sales['revenue'], $cashiers['grand_total']);
        $this->assertEquals($sales['net_profit'], $daily['totals']['net_profit']);
    }
}
