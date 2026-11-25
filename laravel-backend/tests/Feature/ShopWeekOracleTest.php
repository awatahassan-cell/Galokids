<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exchanges, several days, and two cashiers — each with hand-worked figures.
 *
 *   A  T-shirt  20,000 (cost 12,000)      B  Jacket  30,000 (cost 18,000)
 */
class ShopWeekOracleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $cashierOne;
    private User $cashierTwo;
    private ProductVariation $a;
    private ProductVariation $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 1]);
        $this->cashierOne = User::factory()->create(['role' => 2, 'name' => 'Kar']);
        $this->cashierTwo = User::factory()->create(['role' => 2, 'name' => 'Shnyar']);

        foreach ([['a', 'A', 20000, 12000], ['b', 'B', 30000, 18000]] as [$prop, $name, $price, $cost]) {
            $p = Product::create(['name' => $name, 'price' => $price, 'cost' => $cost, 'gender' => 0, 'is_active' => true]);
            $this->$prop = ProductVariation::create(['product_id' => $p->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 50, 'sku' => "S-$name"]);
        }
    }

    private function till(User $who, array $lines, array $extra = []): array
    {
        return $this->actingAs($who)->postJson('/api/orders', array_merge([
            'channel' => 'pos', 'payment_method' => 'cash',
            'items' => array_map(fn ($l) => ['product_variation_id' => $l[0]->id, 'quantity' => $l[1]], $lines),
        ], $extra))->assertCreated()->json();
    }

    private function backdate(array $order, string $when): void
    {
        Order::where('id', $order['id'])->update(['created_at' => $when . ' 12:00:00']);
    }

    private function report(string $url): array
    {
        return $this->actingAs($this->admin)->getJson($url)->assertOk()->json();
    }

    public function test_an_exchange_is_one_return_and_one_sale_and_the_drawer_nets_the_difference(): void
    {
        $this->actingAs($this->cashierOne)->postJson('/api/shifts/open', ['opening_float' => 10000])->assertCreated();
        $order = $this->till($this->cashierOne, [[$this->a, 2]]);                 // 40,000 in

        // The customer brings one A back and takes a B: 30,000 − 20,000 = 10,000 more.
        $this->actingAs($this->cashierOne)->postJson("/api/orders/{$order['id']}/exchange", [
            'returned_items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $this->b->id, 'quantity' => 1]],
        ])->assertCreated()->json();

        $drawer = $this->actingAs($this->cashierOne)->getJson('/api/shifts/report')->json('summary');
        // 10,000 float + 40,000 − 20,000 returned + 30,000 replacement = 60,000
        $this->assertEquals(60000, $drawer['expected_cash']);

        // Revenue: the kept A (20,000) + the B (30,000). Cost: 12,000 + 18,000.
        $sales = $this->report('/api/reports/sales');
        $this->assertEquals(50000, $sales['revenue']);
        $this->assertEquals(30000, $sales['cogs']);
        $this->assertEquals(20000, $sales['gross_profit']);
        $this->assertSame(49, $this->a->fresh()->stock_quantity);   // 50 − 2 sold + 1 back
        $this->assertSame(49, $this->b->fresh()->stock_quantity);   // 50 − 1
    }

    public function test_a_date_range_reports_only_its_own_days_and_the_days_add_up_to_the_week(): void
    {
        $d1 = $this->till($this->cashierOne, [[$this->a, 1]]);     // 20,000
        $d2 = $this->till($this->cashierOne, [[$this->b, 2]]);     // 60,000
        $d3 = $this->till($this->cashierOne, [[$this->a, 3]]);     // 60,000
        $this->backdate($d1, now()->subDays(2)->toDateString());
        $this->backdate($d2, now()->subDays(1)->toDateString());
        $this->backdate($d3, now()->toDateString());

        $yesterday = now()->subDays(1)->toDateString();
        $one = $this->report("/api/reports/sales?from=$yesterday&to=$yesterday");
        $this->assertEquals(60000, $one['revenue']);
        $this->assertEquals(36000, $one['cogs']);                  // 2 × 18,000
        $this->assertEquals(1, $one['order_count']);

        $week = $this->report('/api/reports/sales?from=' . now()->subDays(6)->toDateString() . '&to=' . now()->toDateString());
        $this->assertEquals(140000, $week['revenue']);
        $this->assertEquals(6, $week['items_sold']);                // 1 + 2 + 3 pieces

        $daily = $this->report('/api/reports/daily?from=' . now()->subDays(6)->toDateString() . '&to=' . now()->toDateString());
        $byDay = collect($daily['days'])->pluck('revenue', 'day');
        $this->assertEquals([20000, 60000, 60000], [
            $byDay[now()->subDays(2)->toDateString()], $byDay[$yesterday], $byDay[now()->toDateString()],
        ]);
        $this->assertEquals($week['revenue'], $daily['totals']['revenue']);
        $this->assertEquals($week['cogs'], $daily['totals']['cogs']);
    }

    public function test_each_cashier_is_credited_with_exactly_their_own_sales(): void
    {
        $this->till($this->cashierOne, [[$this->a, 2]]);           // 40,000
        $this->till($this->cashierOne, [[$this->b, 1]]);           // 30,000
        $this->till($this->cashierTwo, [[$this->a, 1]]);           // 20,000

        $rows = collect($this->report('/api/reports/cashiers')['cashiers'])->keyBy('name');

        $this->assertEquals(70000, $rows['Kar']['total']);
        $this->assertEquals(2, $rows['Kar']['orders_count']);
        $this->assertEquals(20000, $rows['Shnyar']['total']);
        $this->assertEquals(90000, $this->report('/api/reports/cashiers')['grand_total']);
        $this->assertEquals(90000, $this->report('/api/reports/sales')['revenue']);
    }
}
