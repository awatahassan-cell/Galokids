<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Coupon;
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
}
