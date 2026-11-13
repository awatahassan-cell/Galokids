<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The field names the mobile back office reads.
 *
 * The app's list screens were written against what the database columns are
 * called, and the API does not always send them that way: coupons come back
 * in camelCase, what a supplier is owed is `debt_balance`, whether a message
 * has been read is a `status`, and what an activity entry says is `summary`.
 * Every one of those read as `undefined` on screen — "%undefined" in a coupon
 * table, every supplier owed nothing, every message unread — and none of it
 * was visible to the type checker, because the types were wrong in the same
 * way as the code.
 *
 * This pins the names. If the API is changed, this fails here, where it is
 * cheap, rather than on a shopkeeper's counter.
 */
class BackOfficeFieldNamesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 1]);
    }

    public function test_coupons_are_sent_in_camel_case(): void
    {
        Coupon::create([
            'id' => 'c1', 'code' => 'EID25', 'discount_percentage' => 25,
            'is_active' => true, 'max_uses' => 100, 'min_order_amount' => 20000,
        ]);

        $row = $this->actingAs($this->admin())->getJson('/api/coupons')->assertOk()->json()[0];

        foreach (['id', 'code', 'discountPercentage', 'isActive', 'startDate', 'endDate',
                  'maxUses', 'maxUsesPerCustomer', 'minOrderAmount', 'timesUsed'] as $field) {
            $this->assertArrayHasKey($field, $row, "coupon is missing `$field`");
        }

        $this->assertSame(25.0, (float) $row['discountPercentage']);
        $this->assertSame(100, $row['maxUses']);

        // And not the column names the app used to read.
        foreach (['discount_percentage', 'usage_limit', 'used_count', 'min_subtotal'] as $stale) {
            $this->assertArrayNotHasKey($stale, $row);
        }
    }

    /** The write side takes the same camelCase, and a limit actually lands. */
    public function test_a_coupon_limit_sent_as_max_uses_is_saved(): void
    {
        $this->actingAs($this->admin())->postJson('/api/coupons', [
            'code' => 'LIMITED', 'discountPercentage' => 10, 'isActive' => true, 'maxUses' => 7,
        ])->assertSuccessful();

        $this->assertSame(7, (int) Coupon::where('code', 'LIMITED')->value('max_uses'));
    }

    public function test_what_a_supplier_is_owed_is_debt_balance(): void
    {
        Supplier::create(['name' => 'Istanbul Trading']);

        $row = $this->actingAs($this->admin())->getJson('/api/suppliers')->assertOk()->json();
        $row = ($row['data'] ?? $row)[0];

        $this->assertArrayHasKey('debt_balance', $row);
        $this->assertArrayNotHasKey('balance', $row, 'the app reads debt_balance; a `balance` would be ignored');
    }

    public function test_a_contact_message_says_whether_it_was_read_with_a_status(): void
    {
        \DB::table('contact_messages')->insert([
            'name' => 'Avan', 'message' => 'Hello', 'status' => 'unread',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $row = $this->actingAs($this->admin())->getJson('/api/contact-messages')->assertOk()->json();
        $row = ($row['data'] ?? $row)[0];

        $this->assertSame('unread', $row['status']);
        $this->assertArrayNotHasKey('read_at', $row);
    }

    public function test_an_activity_entry_describes_itself_in_summary(): void
    {
        $admin = $this->admin();

        ActivityLog::create([
            'user_id' => $admin->id, 'user_name' => $admin->name,
            'action' => 'settings.updated', 'subject_type' => 'settings',
            'summary' => 'Updated: hero_slides', 'ip' => '127.0.0.1',
        ]);

        $row = $this->actingAs($admin)->getJson('/api/activity-logs')->assertOk()->json();
        $row = ($row['data'] ?? $row)[0];

        $this->assertSame('Updated: hero_slides', $row['summary']);
        $this->assertArrayNotHasKey('description', $row);
    }

    private function soldOrder(): Order
    {
        $product = Product::create(['name' => 'Kids Tee', 'price' => 20000, 'gender' => 0]);

        $order = Order::create([
            'customer_name' => 'Dayik', 'customer_phone' => '0750 123 4567',
            'status' => 'pending', 'subtotal' => 40000, 'total_amount' => 40000,
            'shipping_fee' => 0, 'channel' => 'pos',
        ]);

        $order->items()->create([
            'product_id' => $product->id, 'product_name' => 'Kids Tee', 'quantity' => 2, 'price' => 20000,
        ]);

        return $order;
    }

    /** The status chips are drawn from these keys. */
    public function test_order_counts_carry_a_total_and_one_key_per_status(): void
    {
        $this->soldOrder();

        $counts = $this->actingAs($this->admin())->getJson('/api/orders/counts?channel=pos')->assertOk()->json();

        foreach (['total', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'new_and_pending'] as $key) {
            $this->assertArrayHasKey($key, $counts);
        }
        $this->assertSame(1, $counts['pending']);
    }

    /** The order sheet reads the trail as a bare list, newest first. */
    public function test_order_history_is_a_list_of_transitions_with_who_made_them(): void
    {
        $admin = $this->admin();
        $order = $this->soldOrder();

        $this->actingAs($admin)->putJson("/api/orders/{$order->id}", ['status' => 'processing'])->assertOk();

        $history = $this->actingAs($admin)->getJson("/api/orders/{$order->id}/history")->assertOk()->json();

        $this->assertNotEmpty($history);
        foreach (['id', 'from_status', 'to_status', 'note', 'created_at', 'user'] as $key) {
            $this->assertArrayHasKey($key, $history[0], "history entry is missing `$key`");
        }
        $this->assertSame('processing', $history[0]['to_status']);
    }

    /** Refund takes order_item_id + quantity, and the lines then say how many came back. */
    public function test_a_refund_marks_the_returned_quantity_on_the_line(): void
    {
        $admin = $this->admin();
        $order = $this->soldOrder();
        $line = $order->items()->first();

        $this->actingAs($admin)->postJson("/api/orders/{$order->id}/refund", [
            'items' => [['order_item_id' => $line->id, 'quantity' => 1]],
            'reason' => 'wrong size',
        ])->assertSuccessful();

        $shown = $this->actingAs($admin)->getJson("/api/orders/{$order->id}")->assertOk()->json();

        $this->assertSame(1, $shown['items'][0]['returned_quantity']);
        $this->assertArrayHasKey('refunded_amount', $shown);
    }

    /** The till finds a returning customer by `phone`, in whichever form it was typed. */
    public function test_customer_lookup_takes_phone_and_answers_found(): void
    {
        $this->soldOrder();

        $hit = $this->actingAs($this->admin())->getJson('/api/customers/lookup?phone=%2B9647501234567')->assertOk()->json();

        $this->assertTrue($hit['found']);
        foreach (['name', 'orders_count', 'total_spent', 'last_order_at'] as $key) {
            $this->assertArrayHasKey($key, $hit);
        }

        $miss = $this->actingAs($this->admin())->getJson('/api/customers/lookup?phone=07709999999')->assertOk()->json();
        $this->assertFalse($miss['found']);
    }

    /** Closing a shift takes `counted_cash`; the app used to send `closing_amount` and was refused. */
    public function test_a_shift_closes_on_counted_cash_and_reports_the_gap(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/shifts/open', ['opening_float' => 50000])->assertSuccessful();

        $this->actingAs($admin)->postJson('/api/shifts/cash', [
            'direction' => 'out', 'amount' => 2000, 'reason' => 'driver',
        ])->assertSuccessful()->assertJsonStructure(['movement' => ['id', 'direction', 'amount', 'reason'], 'summary']);

        $this->actingAs($admin)->postJson('/api/shifts/close', ['closing_amount' => 48000])->assertStatus(422);

        $closed = $this->actingAs($admin)->postJson('/api/shifts/close', ['counted_cash' => 49000])
            ->assertOk()->json();

        foreach (['counted_cash', 'expected_cash', 'difference', 'status'] as $field) {
            $this->assertArrayHasKey($field, $closed['shift']);
        }
        foreach (['orders_count', 'cash_sales', 'card_sales', 'total_sales', 'refunds', 'cash_in', 'cash_out',
                  'opening_float', 'expected_cash'] as $field) {
            $this->assertArrayHasKey($field, $closed['summary']);
        }

        $this->assertEquals(48000, $closed['summary']['expected_cash']);
        $this->assertEquals(1000, $closed['shift']['difference']);
    }

    /** The till's exchange: returned lines + replacement variations, answered with the money difference. */
    public function test_an_exchange_answers_with_the_difference_and_the_replacement_order(): void
    {
        $admin = $this->admin();

        $tee = Product::create(['name' => 'Tee', 'price' => 20000, 'gender' => 0]);
        $small = ProductVariation::create(['product_id' => $tee->id, 'color' => 'Red', 'size' => 'S', 'stock_quantity' => 5]);
        $large = ProductVariation::create(['product_id' => $tee->id, 'color' => 'Red', 'size' => 'L', 'stock_quantity' => 5]);

        $order = Order::create([
            'customer_name' => 'Dayik', 'status' => 'delivered', 'subtotal' => 20000,
            'total_amount' => 20000, 'shipping_fee' => 0, 'channel' => 'pos',
        ]);
        $line = $order->items()->create([
            'product_id' => $tee->id, 'product_variation_id' => $small->id,
            'product_name' => 'Tee', 'quantity' => 1, 'price' => 20000,
        ]);

        $result = $this->actingAs($admin)->postJson("/api/orders/{$order->id}/exchange", [
            'returned_items' => [['order_item_id' => $line->id, 'quantity' => 1]],
            'new_items' => [['product_variation_id' => $large->id, 'quantity' => 1]],
        ])->assertSuccessful()->json();

        foreach (['returned_value', 'new_value', 'difference'] as $key) {
            $this->assertArrayHasKey($key, $result);
        }
        $this->assertArrayHasKey('id', $result['replacement_order']);
        $this->assertEquals(0, $result['difference']);
        $this->assertSame(6, $small->fresh()->stock_quantity);
        $this->assertSame(4, $large->fresh()->stock_quantity);
    }

    /**
     * The app edits a product without resending its variations, then saves each
     * changed one on its own. That only keeps stock history and past orders
     * attached if a product save without a `variations` key leaves the
     * variation rows — and their ids — alone.
     */
    public function test_saving_a_product_without_variations_keeps_their_ids(): void
    {
        $admin = $this->admin();
        $tee = Product::create(['name' => 'Tee', 'price' => 20000, 'gender' => 0]);
        $variation = ProductVariation::create([
            'product_id' => $tee->id, 'color' => 'Red', 'size' => 'S', 'stock_quantity' => 5, 'sku' => 'GK-1',
        ]);

        $this->actingAs($admin)->putJson("/api/products/{$tee->id}", ['price' => 22000, 'name_ku' => 'تی'])->assertOk();

        $this->assertSame($variation->id, $tee->fresh()->variations()->first()->id);

        // And a new variation is added on its own, with a barcode the app generated.
        $this->actingAs($admin)->postJson('/api/variants', [
            'product_id' => $tee->id, 'color' => 'Blue', 'size' => 'M', 'stock_quantity' => 2, 'sku' => 'GK-2',
        ])->assertCreated();

        $shown = $this->actingAs($admin)->getJson("/api/products/{$tee->id}")->assertOk()->json();
        $this->assertCount(2, $shown['variations']);
        foreach (['name_ku', 'description_ku', 'description_ar', 'images', 'is_active'] as $key) {
            $this->assertArrayHasKey($key, $shown);
        }
    }

    /**
     * Purchases: `invoice_number`, `paid_amount`, `purchase_date`, and lines with
     * `cost_price` and `subtotal` — the app first read `reference`, `amount_paid`,
     * `purchased_at` and `unit_cost`, so every purchase showed as unpaid and undated.
     */
    public function test_a_purchase_is_sent_with_invoice_paid_amount_date_and_priced_lines(): void
    {
        $admin = $this->admin();
        $tee = Product::create(['name' => 'Tee', 'price' => 20000, 'gender' => 0]);
        $variation = ProductVariation::create(['product_id' => $tee->id, 'color' => 'Red', 'size' => 'S', 'stock_quantity' => 1, 'sku' => 'GK-P1']);

        $this->actingAs($admin)->postJson('/api/purchases', [
            'supplier_name' => 'Istanbul', 'purchase_date' => '2026-11-12', 'paid_amount' => 5000,
            'items' => [['product_id' => $tee->id, 'product_variation_id' => $variation->id, 'quantity' => 10, 'cost_price' => 900]],
        ])->assertCreated();

        $page = $this->actingAs($admin)->getJson('/api/purchases?page=1&limit=5')->assertOk()->json();
        $row = $page['data'][0];

        foreach (['invoice_number', 'supplier_name', 'purchase_date', 'total_amount', 'paid_amount', 'payment_status'] as $key) {
            $this->assertArrayHasKey($key, $row, "purchase is missing `$key`");
        }
        foreach (['reference', 'amount_paid', 'purchased_at'] as $stale) {
            $this->assertArrayNotHasKey($stale, $row);
        }
        foreach (['quantity', 'cost_price', 'subtotal', 'product', 'variation'] as $key) {
            $this->assertArrayHasKey($key, $row['items'][0], "purchase line is missing `$key`");
        }

        $this->assertEquals(9000, $row['total_amount']);
        $this->assertEquals(5000, $row['paid_amount']);
        $this->assertSame(11, $variation->fresh()->stock_quantity);
    }

    /** Paying a supplier needs a payment_date and reads the note as `notes`; the statement carries the lists. */
    public function test_paying_a_supplier_needs_a_date_and_shows_on_the_statement(): void
    {
        $admin = $this->admin();
        $supplier = Supplier::create(['name' => 'Istanbul', 'opening_balance' => 100000]);

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", ['amount' => 30000])
            ->assertStatus(422);

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", [
            'amount' => 30000, 'payment_date' => '2026-11-13', 'payment_method' => 'cash', 'notes' => 'part',
        ])->assertSuccessful();

        $statement = $this->actingAs($admin)->getJson("/api/suppliers/{$supplier->id}")->assertOk()->json();

        foreach (['purchases', 'payments', 'total_purchases', 'total_paid', 'direct_paid', 'debt_balance'] as $key) {
            $this->assertArrayHasKey($key, $statement);
        }
        $this->assertEquals(70000, $statement['debt_balance']);
        $this->assertSame('part', $statement['payments'][0]['notes']);
    }
}
