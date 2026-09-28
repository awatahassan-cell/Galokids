<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Expense;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The reports the calendar and coupon screens read.
 *
 * These exist because those screens used to add the figures up in the browser,
 * over whatever orders the admin panel had loaded. That was only ever right
 * because the orders endpoint returned the entire table; the moment it pages,
 * a screen doing its own arithmetic describes one page of history as if it were
 * all of it. Counting in SQL is what makes paging the orders list safe.
 */
class ReportEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    private function variation(int $price = 20000, int $cost = 8000, int $stock = 500): ProductVariation
    {
        $product = Product::create(['name' => 'Shirt', 'price' => $price, 'cost' => $cost]);

        return ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => $stock,
        ]);
    }

    /* ----------------------------------------------------------- daily --- */

    public function test_the_daily_report_totals_a_day_the_way_the_sales_report_does(): void
    {
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $variation = $this->variation();

        // 3 kept, 1 of 4 returned, 2 fully returned, 5 cancelled.
        $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'payment_method' => 'cash',
        ])->assertCreated();

        $partly = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 4]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();
        $this->actingAs($cashier)->postJson("/api/orders/{$partly['id']}/refund", [
            'items' => [['order_item_id' => $partly['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $returned = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();
        $this->actingAs($cashier)->postJson("/api/orders/{$returned['id']}/refund", [
            'items' => [['order_item_id' => $returned['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $cancelled = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 5]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();
        $this->actingAs($cashier)->putJson("/api/orders/{$cancelled['id']}", ['status' => 'cancelled'])->assertOk();

        Expense::create([
            'description' => 'Rent', 'amount' => 50000,
            'category' => 'rent', 'date' => now()->toDateString(),
        ]);

        $today = now()->toDateString();
        $daily = $this->actingAs($this->admin())
            ->getJson("/api/reports/daily?from=$today&to=$today")->assertOk()->json();

        $day = collect($daily['days'])->firstWhere('day', $today);
        $this->assertNotNull($day, 'the day the sales were made must appear');

        // 3 + 3 kept pieces at 20,000; the returned ones are back on the shelf.
        $this->assertSame(120000.0, (float) $day['revenue']);
        $this->assertSame(6, $day['items_sold']);
        $this->assertSame(48000.0, (float) $day['cogs']);
        $this->assertSame(50000.0, (float) $day['expenses']);
        $this->assertSame(22000.0, (float) $day['net_profit']);
        $this->assertSame(2, $day['orders_count'], 'the returned and cancelled receipts are not sales');

        // And it has to agree with the report the profit screen shows.
        $sales = $this->actingAs($this->admin())
            ->getJson("/api/reports/sales?from=$today&to=$today")->assertOk()->json();

        $this->assertSame((float) $sales['revenue'], (float) $daily['totals']['revenue']);
        $this->assertSame((float) $sales['cogs'], (float) $daily['totals']['cogs']);
        $this->assertSame($sales['items_sold'], $daily['totals']['items_sold']);
        $this->assertSame($sales['order_count'], $daily['totals']['orders_count']);
        $this->assertSame((float) $sales['net_profit'], (float) $daily['totals']['net_profit']);
    }

    public function test_the_daily_report_splits_the_two_channels(): void
    {
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $customer = User::factory()->create();
        $variation = $this->variation();

        $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
        ])->assertCreated();

        $today = now()->toDateString();
        $day = collect(
            $this->actingAs($this->admin())->getJson("/api/reports/daily?from=$today&to=$today")->assertOk()->json()['days']
        )->firstWhere('day', $today);

        $this->assertSame(40000.0, (float) $day['pos_revenue']);
        $this->assertSame(20000.0, (float) $day['online_revenue']);
        $this->assertSame(1, $day['pos_orders']);
        $this->assertSame(1, $day['online_orders']);
        $this->assertSame(
            (float) $day['revenue'],
            (float) $day['pos_revenue'] + (float) $day['online_revenue']
        );

        // The profit screen splits the cost the same way, so the two halves
        // have to reconcile to the whole there too.
        $totals = $this->actingAs($this->admin())
            ->getJson("/api/reports/daily?from=$today&to=$today")->assertOk()->json('totals');

        $this->assertSame(
            (float) $totals['cogs'],
            (float) $totals['pos_cogs'] + (float) $totals['online_cogs']
        );
    }

    public function test_a_day_with_only_an_expense_still_appears(): void
    {
        // A day the shop spent money and sold nothing is exactly the day an
        // owner wants to see on the calendar.
        Expense::create([
            'description' => 'Supplies', 'amount' => 15000,
            'category' => 'supplies', 'date' => now()->toDateString(),
        ]);

        $today = now()->toDateString();
        $day = collect(
            $this->actingAs($this->admin())->getJson("/api/reports/daily?from=$today&to=$today")->assertOk()->json()['days']
        )->firstWhere('day', $today);

        $this->assertNotNull($day);
        $this->assertSame(0.0, (float) $day['revenue']);
        $this->assertSame(15000.0, (float) $day['expenses']);
        $this->assertSame(-15000.0, (float) $day['net_profit'], 'a day of spending and no sales is a loss');
    }

    public function test_the_daily_report_is_open_to_anyone_granted_reports(): void
    {
        // Not admin-only: a cashier the shop has trusted with reports.view can
        // read it. But it is not part of the till by default — the report shows
        // cost and profit, and the panel's own cashier preset leaves it out, so
        // a cashier nobody has granted it is refused rather than shown margins.
        $this->actingAs(User::factory()->create([
            'role' => Roles::CASHIER,
            'permissions' => ['pos.access', 'reports.view'],
        ]))->getJson('/api/reports/daily')->assertOk();

        $this->actingAs(User::factory()->create(['role' => Roles::CASHIER]))
            ->getJson('/api/reports/daily')->assertForbidden();

        $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->getJson('/api/reports/daily')->assertForbidden();
    }

    /* --------------------------------------------------------- coupons --- */

    public function test_the_coupon_report_counts_redemptions_and_what_they_cost(): void
    {
        Coupon::create(['id' => 'c1', 'code' => 'SAVE10', 'discount_percentage' => 10, 'is_active' => true]);
        Coupon::create(['id' => 'c2', 'code' => 'NEVER', 'discount_percentage' => 50, 'is_active' => false]);

        $customer = User::factory()->create();
        $variation = $this->variation(20000);

        foreach ([1, 1] as $qty) {
            $this->actingAs($customer)->postJson('/api/orders', [
                'items' => [['product_variation_id' => $variation->id, 'quantity' => $qty]],
                'governorate' => 'Erbil',
                'coupon_code' => 'SAVE10',
            ])->assertCreated();
        }

        // One sale with no coupon, so the conversion rate has something to be
        // a fraction of.
        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/coupons')->assertOk()->json();

        $save10 = collect($report['performance'])->firstWhere('code', 'SAVE10');
        $this->assertSame(2, $save10['uses']);
        $this->assertSame(4000.0, (float) $save10['total_discount'], '10% of 20,000, twice');
        $this->assertSame(36000.0, (float) $save10['total_sales']);
        $this->assertTrue($save10['is_active']);

        $never = collect($report['performance'])->firstWhere('code', 'NEVER');
        $this->assertNotNull($never, 'a coupon nobody used still belongs on the list');
        $this->assertSame(0, $never['uses']);

        $this->assertSame(2, $report['total_uses']);
        $this->assertSame(3, $report['order_count']);
        $this->assertEqualsWithDelta(66.7, $report['conversion_rate'], 0.1);
    }

    public function test_a_refunded_coupon_sale_reports_the_money_that_stayed(): void
    {
        Coupon::create(['id' => 'c1', 'code' => 'SAVE10', 'discount_percentage' => 10, 'is_active' => true]);

        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $variation = $this->variation(20000);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
            'coupon_code' => 'SAVE10',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/coupons')->assertOk()->json();
        $row = collect($report['performance'])->firstWhere('code', 'SAVE10');

        // 40,000 less a 4,000 coupon is 36,000; one of the two pieces came back
        // at the 18,000 the customer actually paid for it.
        $this->assertSame(18000.0, (float) $row['total_sales']);
    }

    public function test_the_coupon_report_is_for_the_owner_only(): void
    {
        $this->actingAs(User::factory()->create(['role' => Roles::CASHIER]))
            ->getJson('/api/reports/coupons')->assertForbidden();
    }
}
