<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Setting;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A full sweep of the arithmetic: selling, discounting, returning, reporting
 * and valuing the stock room.
 *
 * Each test states what the shop's books should say and checks the system
 * agrees. Where they disagree the money is wrong somewhere, and a shop only
 * finds that out when the drawer or the stock count comes up short.
 */
class MoneyAuditTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Item', 'price' => 20000, 'cost' => 8000,
        ], $attrs));
    }

    private function variation(Product $p, int $stock = 50, array $attrs = []): ProductVariation
    {
        return ProductVariation::create(array_merge([
            'product_id' => $p->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => $stock,
        ], $attrs));
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    private function cashier(): User
    {
        return User::factory()->create(['role' => Roles::CASHIER]);
    }

    private function sell(User $staff, ProductVariation $v, int $qty, array $extra = []): array
    {
        return $this->actingAs($staff)->postJson('/api/orders', array_merge([
            'items' => [['product_variation_id' => $v->id, 'quantity' => $qty]],
            'payment_method' => 'cash',
        ], $extra))->assertCreated()->json();
    }

    /* ================================================ selling & pricing === */

    public function test_a_variation_price_override_is_what_gets_charged(): void
    {
        $staff = $this->cashier();
        $product = $this->product(['price' => 20000, 'discount_price' => 15000]);
        $variation = $this->variation($product, 50, ['price_override' => 12000]);

        $order = $this->sell($staff, $variation, 2);

        $this->assertSame(24000.0, (float) $order['subtotal'], 'the override beats the sale price');
        $this->assertSame(24000.0, (float) $order['total_amount']);
    }

    public function test_a_percentage_coupon_comes_off_the_goods_and_the_total_follows(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 33333]));

        \App\Models\Coupon::create([
            'id' => 'c-save15', 'code' => 'SAVE15', 'discount_percentage' => 15, 'is_active' => true,
        ]);

        $order = $this->sell($staff, $variation, 1, ['coupon_code' => 'SAVE15']);

        // 15% of 33,333 is 4,999.95 — the dinar has no fils in daily use, so
        // every figure that reaches a receipt must be whole.
        $this->assertSame(round((float) $order['discount_amount']), (float) $order['discount_amount']);
        $this->assertSame(round((float) $order['total_amount']), (float) $order['total_amount']);
        $this->assertSame(
            (float) $order['subtotal'] - (float) $order['discount_amount'] + (float) $order['shipping_fee'],
            (float) $order['total_amount'],
            'total must be goods minus discount plus delivery'
        );
    }

    public function test_a_discount_can_never_exceed_the_goods(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 10000]));

        $order = $this->sell($staff, $variation, 1, ['discount_amount' => 999999]);

        $this->assertSame(0.0, (float) $order['total_amount'], 'a sale can go to zero but never below');
        $this->assertGreaterThanOrEqual(0, (float) $order['total_amount']);
    }

    public function test_change_due_is_what_the_customer_gets_back(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 17500]));

        $order = $this->sell($staff, $variation, 1, ['amount_paid' => 20000]);

        $this->assertSame(2500.0, (float) $order['change_due']);
    }

    public function test_delivery_is_free_over_the_configured_basket_value(): void
    {
        Setting::updateOrCreate(['key' => 'shipping_default_fee'], ['value' => '5000']);
        Setting::updateOrCreate(['key' => 'shipping_free_over'], ['value' => '50000']);

        $customer = User::factory()->create();
        $variation = $this->variation($this->product(['price' => 60000]));

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $this->assertSame(0.0, (float) $order['shipping_fee']);
        $this->assertSame(60000.0, (float) $order['total_amount']);
    }

    public function test_free_delivery_is_judged_on_what_the_customer_pays_not_the_ticket(): void
    {
        // The threshold has to be applied after the discount. Judging it on the
        // pre-discount subtotal gives away delivery on a basket that never
        // reached the threshold.
        Setting::updateOrCreate(['key' => 'shipping_default_fee'], ['value' => '5000']);
        Setting::updateOrCreate(['key' => 'shipping_free_over'], ['value' => '50000']);

        \App\Models\Coupon::create([
            'id' => 'c-half', 'code' => 'HALF', 'discount_percentage' => 50, 'is_active' => true,
        ]);

        $customer = User::factory()->create();
        $variation = $this->variation($this->product(['price' => 60000]));

        $order = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'governorate' => 'Erbil',
            'coupon_code' => 'HALF',
        ])->assertCreated()->json();

        $this->assertSame(30000.0, (float) $order['subtotal'] - (float) $order['discount_amount']);
        $this->assertSame(5000.0, (float) $order['shipping_fee'], '30,000 is under the 50,000 threshold');
    }

    /* ======================================================= the reports === */

    public function test_a_returned_order_is_not_counted_as_a_sale(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000, 'cost' => 8000]));

        $kept = $this->sell($staff, $variation, 1);
        $brought_back = $this->sell($staff, $variation, 1);

        $this->actingAs($staff)->postJson("/api/orders/{$brought_back['id']}/refund", [
            'items' => [['order_item_id' => $brought_back['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(20000.0, (float) $report['revenue'], 'one sale stuck, one came back');
        $this->assertSame(1, $report['order_count'], 'a returned order is not an order the shop made');
        $this->assertSame(1, $report['items_sold'], 'the returned piece is back on the shelf');
        $this->assertSame(8000.0, (float) $report['cogs'], 'the shop only gave up one piece of stock');
        $this->assertSame(12000.0, (float) $report['gross_profit']);
    }

    public function test_a_partial_return_only_takes_its_own_share_out_of_the_report(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000, 'cost' => 8000]));

        $order = $this->sell($staff, $variation, 3);

        $this->actingAs($staff)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(40000.0, (float) $report['revenue'], 'two of the three pieces stayed sold');
        $this->assertSame(2, $report['items_sold']);
        $this->assertSame(16000.0, (float) $report['cogs'], 'only two pieces left the shop for good');
        $this->assertSame(24000.0, (float) $report['gross_profit']);
    }

    public function test_a_cancelled_order_is_in_no_report_figure(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000, 'cost' => 8000]));

        $this->sell($staff, $variation, 1);
        $cancelled = $this->sell($staff, $variation, 5);

        $this->actingAs($staff)->putJson("/api/orders/{$cancelled['id']}", ['status' => 'cancelled'])->assertOk();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(20000.0, (float) $report['revenue']);
        $this->assertSame(1, $report['order_count']);
        $this->assertSame(1, $report['items_sold'], 'the cancelled order never left the shop');
        $this->assertSame(8000.0, (float) $report['cogs']);
    }

    public function test_the_average_order_value_matches_revenue_over_orders(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]));

        $this->sell($staff, $variation, 1);
        $this->sell($staff, $variation, 3);

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(2, $report['order_count']);
        $this->assertSame(80000.0, (float) $report['revenue']);
        $this->assertSame(40000.0, (float) $report['average_order_value']);
    }

    public function test_net_profit_is_gross_profit_less_expenses(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000, 'cost' => 8000]));
        $this->sell($staff, $variation, 5);

        Expense::create([
            'description' => 'Rent', 'amount' => 30000,
            'category' => 'rent', 'date' => now()->toDateString(),
        ]);

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(100000.0, (float) $report['revenue']);
        $this->assertSame(40000.0, (float) $report['cogs']);
        $this->assertSame(60000.0, (float) $report['gross_profit']);
        $this->assertSame(30000.0, (float) $report['expenses']);
        $this->assertSame(30000.0, (float) $report['net_profit']);
    }

    public function test_a_discounted_sale_reports_the_money_that_came_in(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000, 'cost' => 8000]));

        $this->sell($staff, $variation, 2, ['discount_amount' => 5000]);

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(35000.0, (float) $report['revenue'], '40,000 of goods less a 5,000 discount');
        $this->assertSame(16000.0, (float) $report['cogs']);
        $this->assertSame(19000.0, (float) $report['gross_profit']);
    }

    public function test_the_top_products_list_does_not_count_what_came_back(): void
    {
        $staff = $this->cashier();
        $variation = $this->variation($this->product(['name' => 'Hat', 'price' => 20000]));

        $order = $this->sell($staff, $variation, 4);
        $this->actingAs($staff)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 3]],
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();
        $top = collect($report['top_products'])->firstWhere('name', 'Hat');

        $this->assertNotNull($top);
        $this->assertSame(1, (int) $top['qty'], 'three of the four hats came back');
    }

    public function test_the_cashier_breakdown_leaves_out_what_came_back(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]));

        $this->sell($cashier, $variation, 1);
        $returned = $this->sell($cashier, $variation, 2);

        $this->actingAs($cashier)->postJson("/api/orders/{$returned['id']}/refund", [
            'items' => [['order_item_id' => $returned['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $report = $this->actingAs($this->admin())->getJson('/api/reports/cashiers')->assertOk()->json();
        $row = collect($report['cashiers'])->firstWhere('user_id', $cashier->id);

        $this->assertNotNull($row);
        $this->assertSame(20000.0, (float) $row['total'], 'only the sale that stuck counts');
        $this->assertSame(1, (int) $row['orders_count']);
    }

    public function test_the_two_channels_add_up_to_the_revenue(): void
    {
        Setting::updateOrCreate(['key' => 'shipping_default_fee'], ['value' => '0']);

        $cashier = $this->cashier();
        $customer = User::factory()->create();
        $variation = $this->variation($this->product(['price' => 20000]));

        $this->sell($cashier, $variation, 2);                          // 40,000 in store
        $web = $this->actingAs($customer)->postJson('/api/orders', [   // 60,000 online
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'governorate' => 'Erbil',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$web['id']}/refund", [
            'items' => [['order_item_id' => $web['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();                                            // 20,000 back

        $report = $this->actingAs($this->admin())->getJson('/api/reports/sales')->assertOk()->json();

        $this->assertSame(40000.0, (float) $report['pos_revenue']);
        $this->assertSame(40000.0, (float) $report['online_revenue'], '60,000 less the 20,000 that came back');
        $this->assertSame(
            (float) $report['revenue'],
            (float) $report['pos_revenue'] + (float) $report['online_revenue'],
            'the split has to reconcile to the headline figure'
        );
    }

    /* ====================================================== the drawer === */

    public function test_the_drawer_expects_the_cash_that_came_in_less_what_went_back(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]));

        $this->actingAs($cashier)->postJson('/api/shifts/open', ['opening_float' => 50000])->assertCreated();

        $sale = $this->sell($cashier, $variation, 2);           // 40,000 in
        $this->sell($cashier, $variation, 1);                   // 20,000 in

        $this->actingAs($cashier)->postJson("/api/orders/{$sale['id']}/refund", [
            'items' => [['order_item_id' => $sale['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();                                     // 20,000 out

        $this->actingAs($cashier)->postJson('/api/shifts/cash', [
            'direction' => 'out', 'amount' => 10000, 'reason' => 'Driver',
        ])->assertCreated();                                     // 10,000 out

        $summary = $this->actingAs($cashier)->getJson('/api/shifts/report')->assertOk()->json()['summary'];

        $this->assertSame(60000.0, (float) $summary['cash_sales']);
        $this->assertSame(20000.0, (float) $summary['refunds']);
        $this->assertSame(10000.0, (float) $summary['cash_out']);
        $this->assertSame(80000.0, (float) $summary['expected_cash'], '50,000 float + 60,000 in - 20,000 - 10,000');
    }

    public function test_a_card_sale_does_not_land_in_the_cash_drawer(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]));

        $this->actingAs($cashier)->postJson('/api/shifts/open', ['opening_float' => 0])->assertCreated();
        $this->sell($cashier, $variation, 1, ['payment_method' => 'card']);
        $this->sell($cashier, $variation, 1, ['payment_method' => 'cash']);

        $summary = $this->actingAs($cashier)->getJson('/api/shifts/report')->assertOk()->json()['summary'];

        $this->assertSame(20000.0, (float) $summary['cash_sales']);
        $this->assertSame(20000.0, (float) $summary['card_sales']);
        $this->assertSame(20000.0, (float) $summary['expected_cash'], 'only the cash sale is in the till');
    }

    /* ================================================= refund guardrails === */

    public function test_the_same_item_cannot_be_refunded_twice(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]), 10);

        $order = $this->sell($cashier, $variation, 2);
        $itemId = $order['items'][0]['id'];

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 2]],
        ])->assertCreated();

        // Everything is already back. A second attempt must pay out nothing and
        // must not put the stock on the shelf a second time.
        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 2]],
        ])->assertStatus(422);

        $this->assertSame(40000.0, (float) Order::find($order['id'])->refunded_amount);
        $this->assertSame(10, $variation->fresh()->stock_quantity);
    }

    public function test_a_refund_gives_back_only_the_share_that_was_paid(): void
    {
        // A 25% discount means each piece was paid at 75% of its ticket price,
        // and that is all that can come back.
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(['price' => 20000]));

        $order = $this->sell($cashier, $variation, 2, ['discount_amount' => 10000]);
        $this->assertSame(30000.0, (float) $order['total_amount']);

        $refund = $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->assertSame(15000.0, (float) $refund['refund']['amount'], 'half the discounted sale');
    }

    /* ================================================== stock movements === */

    public function test_the_stock_ledger_adds_up_to_what_is_on_the_shelf(): void
    {
        $cashier = $this->cashier();
        $variation = $this->variation($this->product(), 20);

        $order = $this->sell($cashier, $variation, 5);
        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated();

        $this->assertSame(17, $variation->fresh()->stock_quantity, '20 - 5 sold + 2 back');

        // Every movement recorded against this variation must reconcile to the
        // shelf, otherwise the ledger and the stock count tell two stories.
        $net = (int) \App\Models\StockMovement::where('product_variation_id', $variation->id)->sum('quantity_change');
        $this->assertSame(-3, $net, 'the ledger has to agree with the shelf');
    }

    public function test_selling_more_than_is_on_the_shelf_is_refused_online(): void
    {
        $customer = User::factory()->create();
        $variation = $this->variation($this->product(), 2);

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 3]],
            'governorate' => 'Erbil',
        ])->assertStatus(422);

        $this->assertSame(2, $variation->fresh()->stock_quantity, 'a refused order must not touch the stock');
    }
}
