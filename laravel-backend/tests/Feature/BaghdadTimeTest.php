<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use App\Support\Roles;
use App\Support\TimestampShift;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The shop's clock.
 *
 * A shop's day runs from the moment it opens to the moment it closes, and both
 * of those are Baghdad times. Running the books on UTC put the daily cut-off at
 * 03:00 in the morning, so an evening sale could land on the wrong day's report
 * and every recorded time read three hours early.
 */
class BaghdadTimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_application_keeps_baghdad_time(): void
    {
        $this->assertSame('Asia/Baghdad', config('app.timezone'));
        $this->assertSame('Asia/Baghdad', date_default_timezone_get());
    }

    public function test_baghdad_is_three_hours_ahead_of_utc_all_year(): void
    {
        // Iraq dropped daylight saving in 2008, which is what lets the one-off
        // shift of old rows be a single constant. If that ever changed, this
        // test is the thing that would notice.
        foreach (['2026-01-15 12:00:00', '2026-07-15 12:00:00'] as $moment) {
            $utc = \Carbon\Carbon::parse($moment, 'UTC');
            $this->assertSame(
                3 * 3600,
                $utc->copy()->setTimezone('Asia/Baghdad')->getOffset(),
                "Asia/Baghdad should be UTC+3 on $moment"
            );
        }
    }

    public function test_a_sale_is_recorded_at_the_time_the_shop_saw_on_the_clock(): void
    {
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $product = Product::create(['name' => 'Hat', 'price' => 10000, 'cost' => 4000]);
        $variation = ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => 5,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $storedHour = (int) Order::find($order['id'])->created_at->format('H');
        $baghdadHour = (int) now()->setTimezone('Asia/Baghdad')->format('H');

        $this->assertSame($baghdadHour, $storedHour, 'the till and the clock on the wall must agree');
    }

    public function test_the_invoice_number_carries_the_baghdad_date(): void
    {
        // Between midnight and 03:00 the UTC date is still yesterday, so an
        // invoice numbered from it would carry the wrong day.
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $product = Product::create(['name' => 'Hat', 'price' => 10000]);
        $variation = ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => 5,
        ]);

        $order = $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated()->json();

        $this->assertStringContainsString(
            now()->setTimezone('Asia/Baghdad')->format('Ymd'),
            $order['invoice_no']
        );
    }

    /* ------------------------------------ moving what is already stored --- */

    public function test_the_shift_moves_a_stored_time_by_the_hours_given(): void
    {
        $product = Product::create(['name' => 'Hat', 'price' => 10000]);
        DB::table('products')->where('id', $product->id)
            ->update(['created_at' => '2026-08-12 18:00:00', 'updated_at' => '2026-08-12 18:00:00']);

        TimestampShift::shiftAllBy(3);

        $this->assertSame(
            '2026-08-12 21:00:00',
            DB::table('products')->where('id', $product->id)->value('created_at')
        );
    }

    public function test_the_shift_carries_a_late_evening_row_into_the_next_day(): void
    {
        // 22:30 UTC is 01:30 the following morning in Baghdad. Getting this
        // wrong is exactly the case the shift exists for.
        $product = Product::create(['name' => 'Hat', 'price' => 10000]);
        DB::table('products')->where('id', $product->id)
            ->update(['created_at' => '2026-08-12 22:30:00']);

        TimestampShift::shiftAllBy(3);

        $this->assertSame(
            '2026-08-13 01:30:00',
            DB::table('products')->where('id', $product->id)->value('created_at')
        );
    }

    public function test_the_shift_leaves_date_only_columns_alone(): void
    {
        // An expense dated the 12th is the 12th in every timezone. Moving it by
        // hours would drag the ones near midnight into the wrong day, and the
        // wrong month's books.
        Expense::create([
            'description' => 'Rent', 'amount' => 1000,
            'category' => 'rent', 'date' => '2026-08-12',
        ]);

        TimestampShift::shiftAllBy(3);

        $stored = (string) DB::table('expenses')->value('date');
        $this->assertStringStartsWith('2026-08-12', $stored);
    }

    public function test_the_shift_is_reversible(): void
    {
        $product = Product::create(['name' => 'Hat', 'price' => 10000]);
        DB::table('products')->where('id', $product->id)->update(['created_at' => '2026-08-12 09:15:00']);

        TimestampShift::shiftAllBy(3);
        TimestampShift::shiftAllBy(-3);

        $this->assertSame(
            '2026-08-12 09:15:00',
            DB::table('products')->where('id', $product->id)->value('created_at')
        );
    }

    public function test_the_shift_finds_time_columns_that_are_not_the_usual_two(): void
    {
        // shifts.opened_at / closed_at and orders.created_at are all times, and
        // a shift that only knew about created_at/updated_at would leave the
        // Z-report reading three hours out.
        $this->assertContains('opened_at', TimestampShift::timeColumns('shifts'));
        $this->assertContains('closed_at', TimestampShift::timeColumns('shifts'));
        $this->assertContains('created_at', TimestampShift::timeColumns('orders'));
        $this->assertNotContains('date', TimestampShift::timeColumns('expenses'));
    }

    public function test_todays_report_covers_the_shop_day_that_is_running_now(): void
    {
        $cashier = User::factory()->create(['role' => Roles::CASHIER]);
        $admin = User::factory()->create(['role' => Roles::ADMIN]);
        $product = Product::create(['name' => 'Hat', 'price' => 10000, 'cost' => 4000]);
        $variation = ProductVariation::create([
            'product_id' => $product->id, 'color' => 'Pink', 'size' => '2-3Y', 'stock_quantity' => 5,
        ]);

        $this->actingAs($cashier)->postJson('/api/orders', [
            'items' => [['product_variation_id' => $variation->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])->assertCreated();

        $today = now()->toDateString();
        $report = $this->actingAs($admin)
            ->getJson("/api/reports/sales?from=$today&to=$today")
            ->assertOk()->json();

        $this->assertSame(10000.0, (float) $report['revenue'], "a sale made now belongs to today's report");
    }
}
