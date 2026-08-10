<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Refund;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderMoneyTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $attrs = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Test Product',
            'price' => 25000,
            'cost' => 10000,
        ], $attrs));
    }

    private function variation(Product $product, array $attrs = []): ProductVariation
    {
        return ProductVariation::create(array_merge([
            'product_id' => $product->id,
            'color' => 'Red',
            'size' => 'M',
            'stock_quantity' => 10,
        ], $attrs));
    }

    public function test_the_server_prices_a_line_from_the_catalogue_not_the_client(): void
    {
        $customer = User::factory()->create();
        $product = $this->product(['price' => 25000, 'discount_price' => 20000]);
        $variation = $this->variation($product);

        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [[
                'product_variation_id' => $variation->id,
                'quantity' => 2,
                // A tampered client price must be ignored for a customer.
                'unit_price' => 1,
            ]],
        ]);

        $response->assertCreated();
        // 2 × the discounted 20,000 — not 2 × 25,000 and not 2 × 1.
        $this->assertSame(40000.0, (float) $response->json('total_amount'));
    }

    public function test_a_variation_price_override_wins(): void
    {
        $customer = User::factory()->create();
        $product = $this->product(['price' => 25000, 'discount_price' => 20000]);
        $variation = $this->variation($product, ['price_override' => 30000]);

        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
        ]);

        $response->assertCreated();
        $this->assertSame(30000.0, (float) $response->json('total_amount'));
    }

    public function test_totals_are_whole_dinars_after_a_percentage_coupon(): void
    {
        $customer = User::factory()->create();
        $product = $this->product(['price' => 33333]);
        $variation = $this->variation($product);

        Coupon::create([
            'id' => 'c1', 'code' => 'SAVE15', 'discount_percentage' => 15, 'is_active' => true,
        ]);

        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'coupon_code' => 'SAVE15',
        ]);

        $response->assertCreated();
        $total = (float) $response->json('total_amount');
        $discount = (float) $response->json('discount_amount');

        // 15% of 33,333 is 4,999.95 — the stored figures must not carry fractions.
        $this->assertSame(round($discount), $discount, 'discount must be a whole dinar');
        $this->assertSame(round($total), $total, 'total must be a whole dinar');
        $this->assertSame(5000.0, $discount);
        $this->assertSame(28333.0, $total);
    }

    public function test_a_zero_discount_price_does_not_make_a_product_free(): void
    {
        $customer = User::factory()->create();
        // A row saved before the catalogue rejected it.
        $product = $this->product(['price' => 25000, 'discount_price' => 0]);
        $variation = $this->variation($product);

        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
        ]);

        $response->assertCreated();
        $this->assertSame(25000.0, (float) $response->json('total_amount'));
    }

    public function test_a_discount_above_the_price_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/products', [
            'name' => 'Bad pricing',
            'price' => 10000,
            'discount_price' => 15000,
        ])->assertStatus(422);
    }

    public function test_a_coupon_typed_in_lower_case_still_applies_at_checkout(): void
    {
        $customer = User::factory()->create();
        $product = $this->product(['price' => 10000]);
        $variation = $this->variation($product);

        Coupon::create([
            'id' => 'c3', 'code' => 'SAVE10', 'discount_percentage' => 10, 'is_active' => true,
        ]);

        // The checkout page accepts it case-insensitively…
        $this->postJson('/api/coupons/validate', ['code' => 'save10'])
            ->assertOk()->assertJson(['valid' => true]);

        // …so the order must honour it too, not silently charge full price.
        $response = $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'coupon_code' => 'save10',
        ]);

        $response->assertCreated();
        $this->assertSame(1000.0, (float) $response->json('discount_amount'));
        $this->assertSame(9000.0, (float) $response->json('total_amount'));
    }

    public function test_stock_is_decremented_and_a_customer_cannot_oversell(): void
    {
        $customer = User::factory()->create();
        $product = $this->product();
        $variation = $this->variation($product, ['stock_quantity' => 3]);

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
        ])->assertCreated();

        $this->assertSame(1, (int) $variation->fresh()->stock_quantity);

        $this->actingAs($customer)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 5]],
        ])->assertStatus(422);

        $this->assertSame(1, (int) $variation->fresh()->stock_quantity);
    }

    public function test_every_order_gets_its_own_invoice_number(): void
    {
        $cashier = User::factory()->cashier()->create();
        $product = $this->product();
        $variation = $this->variation($product, ['stock_quantity' => 100]);

        $numbers = [];
        for ($i = 0; $i < 5; $i++) {
            $numbers[] = $this->actingAs($cashier)->postJson('/api/orders', [
                'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            ])->assertCreated()->json('invoice_no');
        }

        $this->assertCount(5, array_unique($numbers), 'invoice numbers must be unique');
    }

    public function test_an_item_cannot_be_refunded_twice(): void
    {
        $cashier = User::factory()->cashier()->create();
        $product = $this->product(['price' => 10000]);
        $variation = $this->variation($product, ['stock_quantity' => 10]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $itemId = $order['items'][0]['id'];
        $stockAfterSale = (int) $variation->fresh()->stock_quantity;

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 2]],
        ])->assertCreated();

        // A second attempt on the same line must be refused.
        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $itemId, 'quantity' => 2]],
        ])->assertStatus(422);

        $this->assertSame(20000.0, (float) Refund::sum('amount'), 'refunded once only');
        $this->assertSame($stockAfterSale + 2, (int) $variation->fresh()->stock_quantity, 'stock returned once only');
        $this->assertSame(20000.0, (float) Order::find($order['id'])->refunded_amount);
    }

    public function test_a_refund_gives_back_what_was_paid_not_the_list_price(): void
    {
        $cashier = User::factory()->cashier()->create();
        $product = $this->product(['price' => 10000]);
        $variation = $this->variation($product, ['stock_quantity' => 10]);

        Coupon::create([
            'id' => 'c2', 'code' => 'HALF', 'discount_percentage' => 50, 'is_active' => true,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'coupon_code' => 'HALF',
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        // Paid 10,000 for two items listed at 10,000 each.
        $this->assertSame(10000.0, (float) $order['total_amount']);

        $refund = $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 2]],
        ])->assertCreated()->json();

        // Refund the 10,000 taken, not the 20,000 list price.
        $this->assertSame(10000.0, (float) $refund['refund']['amount']);
    }

    public function test_a_fully_refunded_cash_sale_does_not_make_the_drawer_look_short(): void
    {
        $cashier = User::factory()->cashier()->create();
        $product = $this->product(['price' => 10000]);
        $variation = $this->variation($product, ['stock_quantity' => 10]);

        $this->actingAs($cashier)->postJson('/api/shifts/open', ['opening_float' => 50000])
            ->assertCreated();

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($cashier)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $summary = $this->actingAs($cashier)->getJson('/api/shifts/report')
            ->assertOk()->json('summary');

        // Took 10,000, gave 10,000 back: the drawer still holds the float.
        $this->assertSame(50000.0, (float) $summary['expected_cash']);
    }

    public function test_the_sales_report_nets_off_refunds(): void
    {
        $admin = User::factory()->admin()->create();
        $product = $this->product(['price' => 10000, 'cost' => 4000]);
        $variation = $this->variation($product, ['stock_quantity' => 10]);

        $order = $this->actingAs($admin)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->actingAs($admin)->postJson("/api/orders/{$order['id']}/refund", [
            'items' => [['order_item_id' => $order['items'][0]['id'], 'quantity' => 1]],
        ])->assertCreated();

        $report = $this->actingAs($admin)->getJson('/api/reports/sales')->assertOk()->json();

        // Sold 20,000, refunded 10,000.
        $this->assertSame(10000.0, (float) $report['revenue']);
        $this->assertSame(10000.0, (float) $report['refunded']);
    }
}
