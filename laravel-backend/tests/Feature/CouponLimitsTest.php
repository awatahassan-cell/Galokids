<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CouponLimitsTest extends TestCase
{
    use RefreshDatabase;

    private ProductVariation $variation;

    protected function setUp(): void
    {
        parent::setUp();

        $product = Product::create(['name' => 'Shirt', 'price' => 10000, 'cost' => 4000]);
        $this->variation = ProductVariation::create([
            'product_id' => $product->id,
            'color' => 'Red',
            'size' => 'M',
            'stock_quantity' => 500,
        ]);
    }

    private function order(User $user, ?string $code = null, array $extra = [])
    {
        return $this->actingAs($user)->postJson('/api/orders', array_merge([
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 1]],
            'coupon_code' => $code,
        ], $extra));
    }

    public function test_a_coupon_stops_working_after_its_total_limit(): void
    {
        Coupon::create([
            'id' => 'c1', 'code' => 'ONCE', 'discount_percentage' => 10,
            'is_active' => true, 'max_uses' => 2,
        ]);

        $this->order(User::factory()->create(), 'ONCE')->assertCreated();
        $this->order(User::factory()->create(), 'ONCE')->assertCreated();

        $this->order(User::factory()->create(), 'ONCE')
            ->assertStatus(422)
            ->assertJson(['coupon_problem' => 'fully_used']);
    }

    public function test_a_customer_cannot_exceed_their_own_limit(): void
    {
        Coupon::create([
            'id' => 'c2', 'code' => 'WELCOME', 'discount_percentage' => 20,
            'is_active' => true, 'max_uses_per_customer' => 1,
        ]);

        $customer = User::factory()->create();
        $this->order($customer, 'WELCOME')->assertCreated();

        $this->order($customer, 'WELCOME')
            ->assertStatus(422)
            ->assertJson(['coupon_problem' => 'already_used_by_customer']);

        // Somebody else is unaffected.
        $this->order(User::factory()->create(), 'WELCOME')->assertCreated();
    }

    public function test_the_per_customer_limit_also_follows_the_phone_number(): void
    {
        Coupon::create([
            'id' => 'c3', 'code' => 'ONEPER', 'discount_percentage' => 20,
            'is_active' => true, 'max_uses_per_customer' => 1,
        ]);

        $cashier = User::factory()->cashier()->create();

        // Same shopper at the till, in two different phone formats.
        $this->order($cashier, 'ONEPER', ['customer_phone' => '07501234567'])->assertCreated();

        $this->order($cashier, 'ONEPER', ['customer_phone' => '+964 750 123 4567'])
            ->assertStatus(422)
            ->assertJson(['coupon_problem' => 'already_used_by_customer']);
    }

    public function test_a_minimum_basket_is_enforced(): void
    {
        Coupon::create([
            'id' => 'c4', 'code' => 'BIG', 'discount_percentage' => 10,
            'is_active' => true, 'min_order_amount' => 50000,
        ]);

        // One item is 10,000 — below the minimum.
        $this->order(User::factory()->create(), 'BIG')
            ->assertStatus(422)
            ->assertJson(['coupon_problem' => 'min_order_amount']);

        $this->actingAs(User::factory()->create())->postJson('/api/orders', [
            'items' => [['product_variation_id' => $this->variation->id, 'quantity' => 6]],
            'coupon_code' => 'BIG',
        ])->assertCreated();
    }

    public function test_a_cancelled_order_releases_its_use(): void
    {
        Coupon::create([
            'id' => 'c5', 'code' => 'LIMITED', 'discount_percentage' => 10,
            'is_active' => true, 'max_uses' => 1,
        ]);

        $order = $this->order(User::factory()->create(), 'LIMITED')->assertCreated()->json();

        // Used up.
        $this->order(User::factory()->create(), 'LIMITED')->assertStatus(422);

        Order::where('id', $order['id'])->update(['status' => 'cancelled']);

        // The cancelled order no longer counts, so the code works again.
        $this->order(User::factory()->create(), 'LIMITED')->assertCreated();
    }

    public function test_the_checkout_check_reports_the_same_limits(): void
    {
        Coupon::create([
            'id' => 'c6', 'code' => 'MIN20K', 'discount_percentage' => 10,
            'is_active' => true, 'min_order_amount' => 20000,
        ]);

        $this->postJson('/api/coupons/validate', ['code' => 'MIN20K', 'subtotal' => 5000])
            ->assertStatus(422)
            ->assertJson(['valid' => false, 'reason' => 'min_order_amount']);

        $this->postJson('/api/coupons/validate', ['code' => 'MIN20K', 'subtotal' => 25000])
            ->assertOk()
            ->assertJson(['valid' => true]);
    }

    public function test_a_coupon_without_limits_still_works_for_everyone(): void
    {
        Coupon::create([
            'id' => 'c7', 'code' => 'OPEN', 'discount_percentage' => 10, 'is_active' => true,
        ]);

        $customer = User::factory()->create();
        $this->order($customer, 'OPEN')->assertCreated();
        $this->order($customer, 'OPEN')->assertCreated();
        $this->order(User::factory()->create(), 'OPEN')->assertCreated();
    }
}
