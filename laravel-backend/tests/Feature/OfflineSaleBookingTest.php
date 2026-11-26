<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A till that sold with no signal reports its sales later. They must land in
 * the drawer and the day they belong to — and a retry must never double them.
 */
class OfflineSaleBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $cashier;
    private ProductVariation $v;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cashier = User::factory()->create(['role' => 2]);
        $p = Product::create(['name' => 'Tee', 'price' => 20000, 'cost' => 12000, 'gender' => 0, 'is_active' => true]);
        $this->v = ProductVariation::create(['product_id' => $p->id, 'color' => 'Red', 'size' => 'M', 'stock_quantity' => 50, 'sku' => 'T-1']);
    }

    private function sale(array $extra = [])
    {
        return $this->actingAs($this->cashier)->postJson('/api/orders', array_merge([
            'channel' => 'pos', 'payment_method' => 'cash',
            'items' => [['product_variation_id' => $this->v->id, 'quantity' => 1]],
        ], $extra));
    }

    private function shift(string $opened, ?string $closed, string $status): Shift
    {
        return Shift::create([
            'user_id' => $this->cashier->id, 'opening_float' => 0, 'status' => $status,
            'opened_at' => $opened, 'closed_at' => $closed,
        ]);
    }

    public function test_a_sale_synced_after_its_shift_closed_belongs_to_that_shift_not_the_open_one(): void
    {
        $tuesday = $this->shift(now()->subDays(2)->setTime(9, 0), now()->subDays(2)->setTime(18, 0), 'closed');
        $thursday = $this->shift(now()->setTime(8, 0)->subHours(0), null, 'open');

        $order = $this->sale(['sold_at' => now()->subDays(2)->setTime(14, 0)->toIso8601String()])->assertCreated()->json();

        $this->assertSame($tuesday->id, Order::find($order['id'])->shift_id);
        $this->assertNotSame($thursday->id, Order::find($order['id'])->shift_id);
    }

    public function test_a_sale_that_no_shift_covers_is_not_pushed_into_a_drawer_it_never_touched(): void
    {
        $this->shift(now()->setTime(8, 0), null, 'open');

        $order = $this->sale(['sold_at' => now()->subDays(3)->toIso8601String()])->assertCreated()->json();

        $this->assertNull(Order::find($order['id'])->shift_id);
    }

    public function test_an_ordinary_sale_still_goes_in_the_open_shift(): void
    {
        $open = $this->shift(now()->subHour(), null, 'open');

        $order = $this->sale()->assertCreated()->json();

        $this->assertSame($open->id, Order::find($order['id'])->shift_id);
    }

    public function test_a_clock_a_few_minutes_fast_is_tolerated(): void
    {
        $this->shift(now()->subHour(), null, 'open');

        $order = $this->sale(['sold_at' => now()->addMinutes(4)->toIso8601String()])->assertCreated()->json();

        $this->assertFalse(Order::find($order['id'])->created_at->isFuture());
        $this->assertSame(0, ActivityLog::where('action', 'order.sold_at_ignored')->count());
    }

    public function test_a_time_that_is_not_believed_is_booked_now_and_the_shop_is_told(): void
    {
        $this->sale(['sold_at' => now()->subDays(40)->toIso8601String()])->assertCreated();

        $log = ActivityLog::where('action', 'order.sold_at_ignored')->first();
        $this->assertNotNull($log);
        $this->assertStringContainsString('31 days', $log->summary);
    }

    public function test_the_same_sale_sent_twice_is_one_sale_with_the_same_shape_of_answer(): void
    {
        $key = 'till-abc-123';
        $first = $this->sale(['idempotency_key' => $key])->assertCreated()->json();
        $again = $this->sale(['idempotency_key' => $key])->assertOk()->json();

        $this->assertSame($first['id'], $again['id']);
        $this->assertSame(1, Order::where('idempotency_key', $key)->count());
        $this->assertSame(49, $this->v->fresh()->stock_quantity);
        // The replay carries the same relations a fresh sale does.
        $this->assertArrayHasKey('product', $again['items'][0]);
    }

    public function test_a_till_number_that_matches_a_future_server_number_cannot_make_two_receipts_alike(): void
    {
        $first = $this->sale(['invoice_no' => 'INV-' . now()->format('Ymd') . '-0002'])->assertCreated()->json();
        $second = $this->sale()->assertCreated()->json();   // the server would also number this one ...-0002

        $this->assertSame('INV-' . now()->format('Ymd') . '-0002', $first['invoice_no']);
        $this->assertNotSame($first['invoice_no'], $second['invoice_no']);
        $this->assertSame(2, Order::distinct('invoice_no')->count('invoice_no'));
    }
}
