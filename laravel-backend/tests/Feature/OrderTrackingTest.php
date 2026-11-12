<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Following an order without an account.
 *
 * Most of this shop's orders are taken over Instagram and WhatsApp and typed
 * into the till, so the customer never signed in anywhere. `/orders/track` is
 * how those customers find out where their parcel is, which makes two things
 * matter: it has to work for the number they actually say out loud, and it has
 * to give nothing at all to somebody guessing order numbers.
 */
class OrderTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(string $storedPhone): Order
    {
        $product = Product::create(['name' => 'Kids Tee', 'price' => 20000, 'gender' => 0]);

        $order = Order::create([
            'customer_name' => 'Dayik',
            'customer_phone' => $storedPhone,
            'status' => 'shipped',
            'subtotal' => 20000,
            'total_amount' => 25000,
            'shipping_fee' => 5000,
            'shipping_address' => 'Erbil, 100m',
            'channel' => 'social',
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => 'Kids Tee',
            'quantity' => 1,
            'price' => 20000,
        ]);

        return $order;
    }

    /**
     * The case that was broken: a number stored one way, typed another.
     *
     * Staff typing an order in write "0750…". An app normalizes to "964750…"
     * before sending. Compared as strings those never match, so a customer
     * asking after their own order was told it did not exist.
     */
    public function test_every_spelling_of_the_same_number_finds_the_order(): void
    {
        $order = $this->orderFor('07501234567');

        foreach (['07501234567', '9647501234567', '+964 750 123 4567', '7501234567', '00964 750 123 4567'] as $typed) {
            $response = $this->getJson("/api/orders/track?id={$order->id}&phone=" . urlencode($typed));

            $response->assertOk();
            $response->assertJsonPath('id', $order->id);
            $response->assertJsonPath('status', 'shipped');
        }
    }

    /** And the other way round: stored canonical, typed the way it is spoken. */
    public function test_a_canonically_stored_number_is_found_by_the_local_form(): void
    {
        $order = $this->orderFor('9647501234567');

        $this->getJson("/api/orders/track?id={$order->id}&phone=07501234567")
            ->assertOk()
            ->assertJsonPath('id', $order->id);
    }

    public function test_the_wrong_phone_gets_nothing(): void
    {
        $order = $this->orderFor('07501234567');

        $this->getJson("/api/orders/track?id={$order->id}&phone=07509999999")
            ->assertNotFound();
    }

    /**
     * A missing order and a wrong phone answer the same.
     *
     * Any difference between the two lets somebody walk the order numbers with
     * a junk phone and learn exactly which orders exist and how many the shop
     * has taken.
     */
    public function test_a_missing_order_is_indistinguishable_from_a_wrong_phone(): void
    {
        $order = $this->orderFor('07501234567');

        $wrongPhone = $this->getJson("/api/orders/track?id={$order->id}&phone=07509999999");
        $noSuchOrder = $this->getJson('/api/orders/track?id=999999&phone=07501234567');

        $noSuchOrder->assertNotFound();
        $this->assertSame(
            $wrongPhone->json('message'),
            $noSuchOrder->json('message'),
            'the two misses must be impossible to tell apart'
        );
    }

    /** An order with no phone on it cannot be unlocked by sending no phone. */
    public function test_an_order_without_a_phone_is_not_opened_by_an_empty_one(): void
    {
        $order = $this->orderFor('');

        $this->getJson("/api/orders/track?id={$order->id}&phone=0")->assertNotFound();
        // A blank phone fails validation rather than matching the blank on the order.
        $this->getJson("/api/orders/track?id={$order->id}&phone=")->assertStatus(422);
    }

    /**
     * What the endpoint hands over, and what it keeps back.
     *
     * It is open to anyone holding an order number and a phone number, so it
     * must not become a way to read the shop's margins or a customer's account.
     */
    public function test_tracking_gives_the_customer_what_they_need_and_no_more(): void
    {
        $order = $this->orderFor('07501234567');

        $response = $this->getJson("/api/orders/track?id={$order->id}&phone=07501234567");

        $response->assertOk();
        $response->assertJsonStructure([
            'id', 'status', 'created_at', 'total_amount', 'customer_name',
            'shipping_address', 'items' => [['name', 'quantity', 'price']],
        ]);

        foreach (['cost', 'user_id', 'customer_phone', 'amount_paid', 'cashier_id'] as $hidden) {
            $response->assertJsonMissingPath($hidden);
        }
    }

    /** It is public on purpose: no token, no session, no sign-in. */
    public function test_no_account_is_needed(): void
    {
        $order = $this->orderFor('07501234567');

        // Explicitly with nobody signed in.
        $this->assertGuest();

        $this->getJson("/api/orders/track?id={$order->id}&phone=07501234567")->assertOk();
    }

    /**
     * A signed-in customer's own list still finds orders placed as a guest.
     *
     * The same phone-format problem, in the place it was already handled — a
     * regression here would silently empty a customer's order history.
     */
    public function test_a_customers_own_list_includes_their_guest_orders(): void
    {
        $guestOrder = $this->orderFor('07501234567');

        $customer = User::factory()->create(['phone' => '9647501234567', 'role' => 0]);

        $response = $this->actingAs($customer)->getJson('/api/orders?mine=1');

        $response->assertOk();
        $this->assertContains(
            $guestOrder->id,
            array_column($response->json('data'), 'id'),
            'an order placed before signing in belongs to the same person'
        );
    }

    /**
     * `mine` still means "sales I rang up" for a cashier.
     *
     * The same parameter serves two callers who mean different things by it. A
     * customer means "orders that are mine", which includes guest orders under
     * their phone; a cashier means "the till sales I took", which is strictly
     * their own user id. Widening the customer case must not widen this one —
     * a cashier's shift figures would start including other people's sales.
     */
    public function test_mine_still_narrows_a_cashier_to_their_own_sales(): void
    {
        $cashier = User::factory()->create(['phone' => '9647701112233', 'role' => 2]);
        $otherCashier = User::factory()->create(['phone' => '9647704445566', 'role' => 2]);

        $product = Product::create(['name' => 'Tee', 'price' => 10000, 'gender' => 0]);

        $ownSale = Order::create([
            'user_id' => $cashier->id, 'customer_name' => 'POS Cash Sale',
            'status' => 'delivered', 'subtotal' => 10000, 'total_amount' => 10000,
            'channel' => 'pos',
        ]);

        $someoneElses = Order::create([
            'user_id' => $otherCashier->id, 'customer_name' => 'POS Cash Sale',
            'status' => 'delivered', 'subtotal' => 10000, 'total_amount' => 10000,
            'channel' => 'pos',
        ]);

        // A guest order carrying the cashier's own phone number: theirs as a
        // customer, but not a sale they rang up, so not in this list.
        $asACustomer = Order::create([
            'customer_name' => 'Them, shopping',
            'customer_phone' => '07701112233',
            'status' => 'pending', 'subtotal' => 10000, 'total_amount' => 10000,
            'channel' => 'online',
        ]);

        $ids = array_column(
            $this->actingAs($cashier)->getJson('/api/orders?mine=1')->assertOk()->json('data'),
            'id'
        );

        $this->assertContains($ownSale->id, $ids);
        $this->assertNotContains($someoneElses->id, $ids, 'a cashier must not see another cashier\'s sales here');
        $this->assertNotContains($asACustomer->id, $ids, 'their own shopping is not a sale they took');

        $this->assertNotNull($product->id);
    }
}
