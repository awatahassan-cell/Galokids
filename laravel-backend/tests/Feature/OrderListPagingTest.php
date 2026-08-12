<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Paging and filtering the order list.
 *
 * The endpoint used to hand back every order the shop had ever taken, with its
 * lines, products and variations attached, on every single request. The panel
 * then did the searching and filtering in the browser — which only gave the
 * right answer *because* it had the whole table. Both halves had to move
 * together: a page plus browser-side filtering would quietly search one page
 * and present it as the whole shop.
 */
class OrderListPagingTest extends TestCase
{
    use RefreshDatabase;

    private ProductVariation $variation;

    protected function setUp(): void
    {
        parent::setUp();

        $product = Product::create(['name' => 'Shirt', 'price' => 10000, 'cost' => 4000]);
        $this->variation = ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => 10000,
        ]);
    }

    private function cashier(): User
    {
        return User::factory()->create(['role' => Roles::CASHIER]);
    }

    /** Create orders directly: this is about the list, not about selling. */
    private function makeOrders(int $count, array $attrs = []): void
    {
        for ($i = 0; $i < $count; $i++) {
            $order = Order::create(array_merge([
                'customer_name' => 'Customer ' . $i,
                'status' => 'pending',
                'subtotal' => 10000, 'discount_amount' => 0, 'shipping_fee' => 0,
                'total_amount' => 10000, 'channel' => 'pos',
            ], $attrs));

            $order->items()->create([
                'product_id' => $this->variation->product_id,
                'product_variation_id' => $this->variation->id,
                'product_name' => 'Shirt',
                'quantity' => 1, 'price' => 10000,
            ]);
        }
    }

    public function test_the_list_comes_back_a_page_at_a_time(): void
    {
        $this->makeOrders(30);

        $page = $this->actingAs($this->cashier())
            ->getJson('/api/orders?page=1&limit=10')->assertOk()->json();

        $this->assertCount(10, $page['data'], 'a page is a page, not the whole table');
        $this->assertSame(30, $page['total'], 'but the panel still knows how many there are');
        $this->assertSame(3, $page['last_page']);
    }

    public function test_a_later_page_holds_different_orders(): void
    {
        $this->makeOrders(25);

        $first = $this->actingAs($this->cashier())->getJson('/api/orders?page=1&limit=10')->assertOk()->json('data');
        $second = $this->actingAs($this->cashier())->getJson('/api/orders?page=2&limit=10')->assertOk()->json('data');

        $this->assertEmpty(
            array_intersect(array_column($first, 'id'), array_column($second, 'id')),
            'the same order must not appear on two pages'
        );
    }

    public function test_a_caller_cannot_ask_for_the_whole_table_in_one_go(): void
    {
        $this->makeOrders(60);

        $page = $this->actingAs($this->cashier())
            ->getJson('/api/orders?page=1&limit=100000')->assertOk()->json();

        $this->assertLessThanOrEqual(200, count($page['data']), 'the page size is capped');
    }

    /* ------------------------------------------------------------ filters --- */

    public function test_filtering_by_channel_searches_every_page_not_just_the_first(): void
    {
        $this->makeOrders(40, ['channel' => 'pos']);
        $this->makeOrders(1, ['channel' => 'online', 'customer_name' => 'Web shopper']);

        $pos = $this->actingAs($this->cashier())
            ->getJson('/api/orders?channel=pos&limit=10')->assertOk()->json();
        $online = $this->actingAs($this->cashier())
            ->getJson('/api/orders?channel=online&limit=10')->assertOk()->json();

        $this->assertSame(40, $pos['total']);
        $this->assertSame(1, $online['total']);
        $this->assertSame('Web shopper', $online['data'][0]['customer_name']);
    }

    public function test_the_two_channel_filters_between_them_cover_every_order(): void
    {
        // If an order could fall outside both filters it would be invisible in
        // the panel while still counting in the reports — a discrepancy nobody
        // would be able to explain.
        $this->makeOrders(7, ['channel' => 'pos']);
        $this->makeOrders(4, ['channel' => 'online']);
        $this->makeOrders(2, ['channel' => 'web']);

        $all = $this->actingAs($this->cashier())->getJson('/api/orders')->assertOk()->json('total');
        $pos = $this->actingAs($this->cashier())->getJson('/api/orders?channel=pos')->assertOk()->json('total');
        $online = $this->actingAs($this->cashier())->getJson('/api/orders?channel=online')->assertOk()->json('total');

        $this->assertSame(13, $all);
        $this->assertSame($all, $pos + $online, 'every order belongs to exactly one of the two');
    }

    public function test_filtering_by_status_counts_the_whole_table(): void
    {
        $this->makeOrders(30, ['status' => 'pending']);
        $this->makeOrders(4, ['status' => 'delivered']);

        $delivered = $this->actingAs($this->cashier())
            ->getJson('/api/orders?status=delivered&limit=2')->assertOk()->json();

        $this->assertSame(4, $delivered['total'], 'all four, even though a page holds two');
        $this->assertCount(2, $delivered['data']);
    }

    public function test_searching_finds_an_order_that_is_not_on_the_first_page(): void
    {
        $this->makeOrders(60);
        $this->makeOrders(1, ['customer_name' => 'Hevar Ahmed']);
        // Bury it: 60 newer orders push it far down the list.
        $this->makeOrders(60);

        $found = $this->actingAs($this->cashier())
            ->getJson('/api/orders?search=Hevar&limit=10')->assertOk()->json();

        $this->assertSame(1, $found['total']);
        $this->assertSame('Hevar Ahmed', $found['data'][0]['customer_name']);
    }

    public function test_searching_by_invoice_number_finds_the_receipt(): void
    {
        $this->makeOrders(5);
        $order = Order::first();
        $order->update(['invoice_no' => 'INV-20260812-0042']);

        $found = $this->actingAs($this->cashier())
            ->getJson('/api/orders?search=0042')->assertOk()->json();

        $this->assertSame(1, $found['total']);
        $this->assertSame($order->id, $found['data'][0]['id']);
    }

    public function test_searching_by_phone_finds_it_however_it_was_typed(): void
    {
        $this->makeOrders(1, ['customer_phone' => '9647501112233']);

        foreach (['07501112233', '7501112233', '9647501112233'] as $typed) {
            $found = $this->actingAs($this->cashier())
                ->getJson('/api/orders?search=' . $typed)->assertOk()->json();

            $this->assertSame(1, $found['total'], "searching for $typed should find the order");
        }
    }

    public function test_searching_by_product_finds_the_orders_that_contain_it(): void
    {
        $this->makeOrders(3);

        $found = $this->actingAs($this->cashier())
            ->getJson('/api/orders?search=Shirt')->assertOk()->json();

        $this->assertSame(3, $found['total'], 'a customer asking about a product is a normal counter request');
    }

    public function test_filtering_by_date_keeps_to_the_days_asked_for(): void
    {
        $this->makeOrders(3);
        Order::query()->update(['created_at' => '2026-07-04 12:00:00']);
        $this->makeOrders(2);

        $july = $this->actingAs($this->cashier())
            ->getJson('/api/orders?from=2026-07-04&to=2026-07-04')->assertOk()->json();

        $this->assertSame(3, $july['total']);
    }

    /* -------------------------------------------------------- status chips --- */

    public function test_the_status_chips_count_the_whole_shop_not_the_page(): void
    {
        // This is the number the owner glances at. Counting the page would have
        // reported "10 orders" to a shop that had taken ninety.
        $this->makeOrders(50, ['status' => 'pending']);
        $this->makeOrders(30, ['status' => 'shipped']);
        $this->makeOrders(10, ['status' => 'delivered']);

        $counts = $this->actingAs($this->cashier())
            ->getJson('/api/orders/counts')->assertOk()->json();

        $this->assertSame(90, $counts['total']);
        $this->assertSame(50, $counts['pending']);
        $this->assertSame(30, $counts['shipped']);
        $this->assertSame(10, $counts['delivered']);
    }

    public function test_the_chips_describe_the_view_the_filters_produce(): void
    {
        $this->makeOrders(6, ['channel' => 'pos', 'status' => 'pending']);
        $this->makeOrders(4, ['channel' => 'online', 'status' => 'pending']);

        $online = $this->actingAs($this->cashier())
            ->getJson('/api/orders/counts?channel=online')->assertOk()->json();

        $this->assertSame(4, $online['total'], 'the website tab counts website orders');
        $this->assertSame(4, $online['pending']);
    }

    public function test_the_chips_add_up_to_the_total(): void
    {
        $this->makeOrders(3, ['status' => 'pending']);
        $this->makeOrders(2, ['status' => 'processing']);
        $this->makeOrders(4, ['status' => 'shipped']);
        $this->makeOrders(5, ['status' => 'delivered']);
        $this->makeOrders(1, ['status' => 'cancelled']);
        $this->makeOrders(2, ['status' => 'returned']);

        $c = $this->actingAs($this->cashier())->getJson('/api/orders/counts')->assertOk()->json();

        $this->assertSame(
            $c['total'],
            $c['pending'] + $c['processing'] + $c['shipped'] + $c['delivered'] + $c['cancelled'] + $c['returned'],
            'every order must land in exactly one chip'
        );
    }

    /* ----------------------------------------------------- who sees what --- */

    public function test_a_customer_still_only_sees_their_own_orders(): void
    {
        $customer = User::factory()->create(['phone' => '9647501112233']);

        $this->makeOrders(20);                                       // other people's
        $this->makeOrders(3, ['user_id' => $customer->id]);          // theirs
        $this->makeOrders(2, ['customer_phone' => '9647501112233']); // theirs by phone

        $mine = $this->actingAs($customer)->getJson('/api/orders?limit=100')->assertOk()->json();

        $this->assertSame(5, $mine['total'], 'paging must not widen what a customer can see');
    }

    public function test_a_customer_cannot_page_their_way_into_someone_elses_orders(): void
    {
        $customer = User::factory()->create(['phone' => '9647509998877']);
        $this->makeOrders(50);

        $mine = $this->actingAs($customer)->getJson('/api/orders?page=2&limit=10')->assertOk()->json();

        $this->assertSame(0, $mine['total']);
        $this->assertEmpty($mine['data']);
    }

    public function test_a_customer_may_not_count_the_shop(): void
    {
        $this->actingAs(User::factory()->create())->getJson('/api/orders/counts')->assertForbidden();
    }
}
