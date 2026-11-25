<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Expense;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A whole trading day, with every figure worked out by hand beforehand.
 *
 * The other money tests each pin one rule. This one runs the shop the way the
 * shop runs — till sales in cash and by card, a website order with a coupon and
 * delivery, a page order, a cancelled order, two refunds — and then asks every
 * report the same question. The expected numbers below are NOT read back from
 * the code under test; they are the owner's arithmetic. If a report disagrees
 * with the arithmetic, or with another report, one of them is wrong.
 *
 * Catalogue            price   cost   stock
 *   A  T-shirt         20,000  12,000   20
 *   B  Jacket          30,000  18,000   20
 *   C  Cap             10,000   4,000   10   (size "S" is priced 8,000 on its own)
 *
 * The day
 *   1  till, cash   2×A + 1×B, 5,000 off by the cashier   total 65,000
 *   2  till, card   1×C (the 8,000 size)                   total  8,000
 *   3  website      3×A, coupon SAVE10, 4,000 delivery     total 58,000
 *   4  page         1×B + 1×C, 3,000 delivery              total 43,000
 *   5  website      5×B, then cancelled                    (never happened)
 *   6  refund 1×A of order 3  → 20,000 × (54,000 / 60,000) = 18,000
 *   7  refund 1×A of order 1  → 20,000 × (65,000 / 70,000) = 18,571
 *   expenses 7,000
 */
class ShopDayOracleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private ProductVariation $a;
    private ProductVariation $b;
    private ProductVariation $cNormal;
    private ProductVariation $cSmall;

    private function variation(string $name, float $price, float $cost, int $stock, string $size = 'M', ?float $override = null): ProductVariation
    {
        $product = Product::create(['name' => $name, 'price' => $price, 'cost' => $cost, 'gender' => 0, 'is_active' => true]);

        return ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Red', 'size' => $size, 'stock_quantity' => $stock,
            'sku' => 'S-' . uniqid(), 'price_override' => $override,
        ]);
    }

    private function sell(array $lines, array $extra = []): array
    {
        return $this->actingAs($this->admin)->postJson('/api/orders', array_merge([
            'customer_name' => 'C', 'customer_phone' => '07501234567', 'shipping_address' => 'x',
            'items' => array_map(fn ($l) => ['product_variation_id' => $l[0]->id, 'quantity' => $l[1]], $lines),
        ], $extra))->assertCreated()->json();
    }

    private function refund(array $order, int $itemIndex, int $qty): array
    {
        return $this->actingAs($this->admin)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][$itemIndex]['id'], 'quantity' => $qty]],
        ])->assertCreated()->json();
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 1]);
        $this->a = $this->variation('A', 20000, 12000, 20);
        $this->b = $this->variation('B', 30000, 18000, 20);
        $cProduct = Product::create(['name' => 'C', 'price' => 10000, 'cost' => 4000, 'gender' => 0, 'is_active' => true]);
        $this->cNormal = ProductVariation::create(['product_id' => $cProduct->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 5, 'sku' => 'C-M']);
        $this->cSmall = ProductVariation::create(['product_id' => $cProduct->id, 'color' => 'Red', 'size' => 'S', 'stock_quantity' => 5, 'sku' => 'C-S', 'price_override' => 8000]);

        Coupon::create(['id' => 'c-save10', 'code' => 'SAVE10', 'discount_percentage' => 10, 'is_active' => true]);
    }

    /** Runs the day and returns the orders by number. */
    private function tradeTheDay(): array
    {
        $this->actingAs($this->admin)->postJson('/api/shifts/open', ['opening_float' => 50000])->assertCreated();

        $o1 = $this->sell([[$this->a, 2], [$this->b, 1]], ['channel' => 'pos', 'payment_method' => 'cash', 'discount_amount' => 5000, 'amount_paid' => 70000]);
        $o2 = $this->sell([[$this->cSmall, 1]], ['channel' => 'pos', 'payment_method' => 'card']);
        $o3 = $this->sell([[$this->a, 3]], ['channel' => 'online', 'coupon_code' => 'SAVE10', 'shipping_fee' => 4000]);
        $o4 = $this->sell([[$this->b, 1], [$this->cNormal, 1]], ['channel' => 'social', 'shipping_fee' => 3000]);
        $o5 = $this->sell([[$this->b, 5]], ['channel' => 'online', 'shipping_fee' => 4000]);
        $this->actingAs($this->admin)->putJson("/api/orders/{$o5['id']}", ['status' => 'cancelled'])->assertOk();

        $this->refund($o3, 0, 1);
        $this->refund($o1, 0, 1);

        Expense::create(['title' => 'Rent', 'category' => 'rent', 'amount' => 7000, 'date' => now()->toDateString()]);

        return [$o1, $o2, $o3, $o4, $o5];
    }

    public function test_each_order_is_priced_the_way_the_owner_would_price_it(): void
    {
        [$o1, $o2, $o3, $o4, $o5] = $this->tradeTheDay();

        $this->assertEquals([70000, 5000, 65000, 0], [$o1['subtotal'], $o1['discount_amount'], $o1['total_amount'], $o1['shipping_fee']]);
        $this->assertEquals([8000, 0, 8000, 0], [$o2['subtotal'], $o2['discount_amount'], $o2['total_amount'], $o2['shipping_fee']]);   // the size's own price
        $this->assertEquals([60000, 6000, 58000, 4000], [$o3['subtotal'], $o3['discount_amount'], $o3['total_amount'], $o3['shipping_fee']]);
        $this->assertEquals([40000, 0, 43000, 3000], [$o4['subtotal'], $o4['discount_amount'], $o4['total_amount'], $o4['shipping_fee']]);
    }

    public function test_the_stock_on_the_shelf_is_what_was_bought_less_what_stayed_sold(): void
    {
        $this->tradeTheDay();

        // A: 20 − 2 − 3 sold + 1 + 1 returned = 17
        // B: 20 − 1 − 1 − 5 sold + 5 (cancelled) = 18
        // C-M: 5 − 1 = 4        C-S: 5 − 1 = 4
        $this->assertSame(17, $this->a->fresh()->stock_quantity);
        $this->assertSame(18, $this->b->fresh()->stock_quantity);
        $this->assertSame(4, $this->cNormal->fresh()->stock_quantity);
        $this->assertSame(4, $this->cSmall->fresh()->stock_quantity);
    }

    public function test_the_sales_report_matches_the_owners_arithmetic(): void
    {
        $this->tradeTheDay();

        $r = $this->actingAs($this->admin)->getJson('/api/reports/sales')->assertOk()->json();

        // Goods kept: 65,000 + 8,000 + 54,000 + 40,000 − (18,000 + 18,571)
        $this->assertEquals(130429, $r['revenue']);
        $this->assertEquals(54429, $r['pos_revenue']);      // 65,000 − 18,571 + 8,000
        $this->assertEquals(36000, $r['online_revenue']);   // 54,000 − 18,000; the cancelled order is nowhere
        $this->assertEquals(40000, $r['social_revenue']);
        $this->assertEquals(7000, $r['delivery_fees']);     // 4,000 + 3,000; the cancelled order's fee is not collected
        $this->assertEquals(36571, $r['refunded']);
        // Cost of what stayed sold: A 3×12,000 + B 2×18,000 + C 2×4,000
        $this->assertEquals(80000, $r['cogs']);
        $this->assertEquals(50429, $r['gross_profit']);
        $this->assertEquals(7000, $r['expenses']);
        $this->assertEquals(43429, $r['net_profit']);
        // 8 pieces left the shop: A 3 + B 2 + C 2 = 7
        $this->assertEquals(7, $r['items_sold']);
        $this->assertEquals(4, $r['order_count']);          // 1–4; the cancelled one never happened
        $this->assertEquals(32607, $r['average_order_value']);   // 130,429 / 4, rounded
    }

    public function test_every_report_tells_the_same_story(): void
    {
        $this->tradeTheDay();
        $get = fn (string $url) => $this->actingAs($this->admin)->getJson($url)->assertOk()->json();

        $sales = $get('/api/reports/sales');
        $daily = $get('/api/reports/daily')['totals'];
        $cashiers = $get('/api/reports/cashiers');

        $this->assertEquals($sales['revenue'], $sales['pos_revenue'] + $sales['online_revenue'] + $sales['social_revenue'], 'channels add up');
        $this->assertEquals($sales['revenue'], $daily['revenue'], 'calendar = sales report');
        $this->assertEquals($sales['revenue'], $cashiers['grand_total'], 'cashiers = sales report');
        $this->assertEquals($sales['cogs'], $daily['cogs']);
        $this->assertEquals($sales['expenses'], $daily['expenses']);
        $this->assertEquals($sales['net_profit'], $daily['net_profit']);
        $this->assertEquals($sales['delivery_fees'], $daily['delivery_fees']);
        $this->assertEquals($sales['items_sold'], $daily['items_sold']);
        $this->assertEquals($sales['order_count'], $daily['orders_count']);
        $this->assertEquals($sales['gross_profit'] - $sales['expenses'], $sales['net_profit']);
    }

    public function test_the_drawer_expects_only_the_cash_that_really_went_through_it(): void
    {
        $this->tradeTheDay();

        $summary = $this->actingAs($this->admin)->getJson('/api/shifts/report')->assertOk()->json('summary');

        $this->assertEquals(65000, $summary['cash_sales']);
        $this->assertEquals(8000, $summary['card_sales']);
        // Cash back to the customer: only the till sale's refund (18,571). The
        // website order's refund (18,000) never touched the drawer.
        // 50,000 float + 65,000 cash sales − 18,571 = 96,429
        $this->assertEquals(96429, $summary['expected_cash']);
    }

    public function test_the_stock_ledger_explains_every_unit_on_the_shelf(): void
    {
        $this->tradeTheDay();

        foreach ([$this->a, $this->b, $this->cNormal, $this->cSmall] as $variation) {
            $moved = (int) \App\Models\StockMovement::where('product_variation_id', $variation->id)->sum('quantity_change');
            $start = $variation->id === $this->cNormal->id || $variation->id === $this->cSmall->id ? 5 : 20;
            $this->assertSame($variation->fresh()->stock_quantity, $start + $moved, "ledger for variation {$variation->id}");
        }
    }

    public function test_a_card_refund_does_not_touch_the_drawer_but_a_cash_handout_of_a_website_order_does(): void
    {
        $this->actingAs($this->admin)->postJson('/api/shifts/open', ['opening_float' => 10000])->assertCreated();

        $card = $this->sell([[$this->a, 1]], ['channel' => 'pos', 'payment_method' => 'card']);
        $web = $this->sell([[$this->b, 1]], ['channel' => 'online', 'shipping_fee' => 0]);

        $drawer = fn () => $this->actingAs($this->admin)->getJson('/api/shifts/report')->json('summary');

        // The card sale goes back to the card: the drawer is untouched.
        $r = $this->actingAs($this->admin)->postJson("/api/orders/{$card['id']}/refund", [
            'items' => [['order_item_id' => $card['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated()->json();
        $this->assertSame('card', $r['refund']['method']);
        $this->assertEquals(10000, $drawer()['expected_cash']);

        // The cashier hands cash across the counter for a website order: that does leave the drawer.
        $r = $this->actingAs($this->admin)->postJson("/api/orders/{$web['id']}/refund", [
            'method' => 'cash',
            'items' => [['order_item_id' => $web['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated()->json();
        $this->assertSame('cash', $r['refund']['method']);
        $this->assertEquals(10000 - 30000, $drawer()['expected_cash']);
        $this->assertEquals(20000 + 30000, $drawer()['refunds_all']);
    }

    public function test_an_unknown_refund_method_is_refused(): void
    {
        $this->actingAs($this->admin)->postJson('/api/shifts/open', ['opening_float' => 0])->assertCreated();
        $o = $this->sell([[$this->a, 1]], ['channel' => 'pos', 'payment_method' => 'cash']);

        $this->actingAs($this->admin)->postJson("/api/orders/{$o['id']}/refund", [
            'method' => 'bitcoin', 'items' => [['order_item_id' => $o['items'][0]['id'], 'quantity' => 1]],
        ])->assertStatus(422);
    }
}
