<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Who may do what, and what the shop tells a stranger.
 *
 * Every case here stood for something that was wrong: a one-time code handed
 * to anyone who asked for it, a cooldown that never started, a permissions
 * screen the API ignored, and a filter that hid orders with no name on them.
 */
class PermissionsAndOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // No SMS account in the test run, so the staging stand-in is what
        // lets `send-otp` get as far as answering. `testing` is not
        // production, which is the other half of the condition.
        config(['services.otpiq.test_code' => '424242']);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    private function cashier(?array $permissions = null): User
    {
        return User::factory()->create(['role' => Roles::CASHIER, 'permissions' => $permissions]);
    }

    private function staff(?array $permissions = null): User
    {
        return User::factory()->create(['role' => Roles::STAFF, 'permissions' => $permissions]);
    }

    // ---- the one-time code ---------------------------------------------

    public function test_the_code_is_never_returned_to_the_caller(): void
    {
        $body = $this->postJson('/api/send-otp', ['phone' => '07701234567'])->assertOk()->json();

        $this->assertArrayNotHasKey('code', $body);
        $this->assertArrayNotHasKey('directUrl', $body);

        // Nor smuggled inside any other field.
        $stored = Cache::get('otp_9647701234567')['code'] ?? Cache::get('otp_07701234567')['code'] ?? null;
        $this->assertNotNull($stored, 'a code should have been generated and cached');
        $this->assertStringNotContainsString($stored, json_encode($body, JSON_UNESCAPED_UNICODE));
    }

    public function test_a_second_code_for_the_same_number_is_refused(): void
    {
        $this->postJson('/api/send-otp', ['phone' => '07701234567'])->assertOk();
        $this->postJson('/api/send-otp', ['phone' => '07701234567'])->assertStatus(429);
    }

    public function test_a_fixed_code_only_works_when_one_is_configured(): void
    {
        // `123456` was accepted unconditionally: anyone could sign in as
        // anyone, admin included, without ever asking for a code.
        config(['services.otpiq.test_code' => '']);

        $this->postJson('/api/verify-otp', ['phone' => '07701234567', 'code' => '123456'])
            ->assertStatus(422);
    }

    public function test_the_staging_code_is_refused_in_production(): void
    {
        app()->detectEnvironment(fn () => 'production');

        $this->postJson('/api/verify-otp', ['phone' => '07701234567', 'code' => '424242'])
            ->assertStatus(422);
    }

    public function test_a_code_that_could_not_be_sent_is_reported_as_a_failure(): void
    {
        // Nothing configured at all: no gateway, no stand-in. Answering
        // "sent" here is what made a missing API key look like a working shop.
        config(['services.otpiq.test_code' => '', 'services.otpiq.key' => null]);

        $this->postJson('/api/send-otp', ['phone' => '07705550000'])
            ->assertStatus(503)
            ->assertJson(['success' => false]);

        // And no cooldown was left behind, so the next try works at once.
        $this->postJson('/api/send-otp', ['phone' => '07705550000'])->assertStatus(503);
    }

    public function test_the_caller_cannot_choose_what_the_message_says(): void
    {
        $this->postJson('/api/send-otp', [
            'phone' => '07701234567',
            'summary' => 'ANYTHING AN ATTACKER WANTS',
        ])->assertOk();

        // Nothing the caller sent may reach the wire. The response is the only
        // thing observable from here, and it must not echo it back either.
        $body = $this->postJson('/api/send-otp', ['phone' => '07709998888', 'summary' => 'XYZZY'])
            ->assertOk()
            ->json();

        $this->assertStringNotContainsString('XYZZY', json_encode($body, JSON_UNESCAPED_UNICODE));
    }

    public function test_the_caller_cannot_choose_the_delivery_route(): void
    {
        // Every message on the account was coming back Failed — and still
        // costing 25 IQD — because the checkout's "SMS or WhatsApp" choice was
        // passed through as the OTPIQ provider, and the account is not approved
        // for WhatsApp. The gateway picks the route now.
        Http::fake(['*' => Http::response(['smsId' => 'x'], 200)]);
        config(['services.otpiq.key' => 'test-key', 'services.otpiq.provider' => null]);

        $this->postJson('/api/send-otp', ['phone' => '07701234567', 'channel' => 'whatsapp'])
            ->assertOk();

        Http::assertSent(fn ($request) => $request['provider'] === 'auto'
            && $request['smsType'] === 'verification');
    }

    public function test_a_shop_approved_for_whatsapp_can_configure_it(): void
    {
        Http::fake(['*' => Http::response(['smsId' => 'x'], 200)]);
        config(['services.otpiq.key' => 'test-key', 'services.otpiq.provider' => 'whatsapp']);

        $this->postJson('/api/send-otp', ['phone' => '07701234567'])->assertOk();

        Http::assertSent(fn ($request) => $request['provider'] === 'whatsapp');
    }

    // ---- permissions are enforced by the server ------------------------

    public function test_a_cashier_without_the_products_permission_cannot_create_one(): void
    {
        $this->actingAs($this->cashier(['pos.access']))
            ->postJson('/api/products', ['name' => 'Snuck in', 'price' => 1000])
            ->assertForbidden();

        $this->assertSame(0, Product::count());
    }

    public function test_a_cashier_with_the_products_permission_can_create_one(): void
    {
        $this->actingAs($this->cashier(['pos.access', 'products.manage']))
            ->postJson('/api/products', ['name' => 'Allowed', 'price' => 1000])
            ->assertCreated();
    }

    public function test_a_cashier_without_the_reports_permission_cannot_read_them(): void
    {
        $this->actingAs($this->cashier(['pos.access']))
            ->getJson('/api/reports/sales')
            ->assertForbidden();
    }

    public function test_a_staff_account_without_the_delete_permission_cannot_delete_an_order(): void
    {
        $order = Order::create([
            'customer_name' => 'A customer',
            'status' => 'pending',
            'subtotal' => 1000,
            'total_amount' => 1000,
            'channel' => 'online',
        ]);

        $this->actingAs($this->staff(['orders.view', 'orders.manage']))
            ->deleteJson("/api/orders/{$order->id}")
            ->assertForbidden();

        $this->assertNotNull(Order::find($order->id));
    }

    public function test_a_cashier_can_still_open_their_own_till(): void
    {
        // Running a till is `pos.access`. Reading the takings is `pos.reports`,
        // and a cashier who has only the first must not be locked out of work.
        $this->actingAs($this->cashier(['pos.access']))
            ->postJson('/api/shifts/open', ['opening_float' => 0])
            ->assertSuccessful();
    }

    public function test_an_admin_is_never_blocked_by_a_permission(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/products', ['name' => 'Admin made this', 'price' => 1000])
            ->assertCreated();
    }

    public function test_an_account_with_nothing_saved_keeps_what_its_role_could_always_do(): void
    {
        // Staff predating the permissions screen must not be locked out by it.
        $this->actingAs($this->staff(null))
            ->postJson('/api/products', ['name' => 'Legacy staff', 'price' => 1000])
            ->assertCreated();
    }

    // ---- permissions cannot be minted ----------------------------------

    public function test_a_cashier_cannot_save_permissions_onto_a_customer(): void
    {
        $customer = User::factory()->create(['role' => Roles::CUSTOMER]);

        // The edit itself goes through — renaming a customer is a cashier's
        // job, and the panel's user form always sends a permissions field, so
        // refusing the whole request meant a cashier could not correct a
        // customer's name at all. What must not happen is the list being
        // stored: a customer carrying "*" is a back door waiting for the next
        // screen that reads it.
        $this->actingAs($this->cashier(['customers.view']))
            ->putJson("/api/users/{$customer->id}", [
                'name' => 'Renamed at the counter',
                'permissions' => ['*'],
            ])
            ->assertOk();

        $this->assertNull($customer->fresh()->permissions);
        $this->assertSame('Renamed at the counter', $customer->fresh()->name);
    }

    public function test_a_cashier_still_cannot_give_a_colleague_permissions(): void
    {
        $colleague = $this->staff(['orders.view']);

        $this->actingAs($this->cashier(['customers.view']))
            ->putJson("/api/users/{$colleague->id}", ['permissions' => ['*']])
            ->assertForbidden();

        $this->assertSame(['orders.view'], $colleague->fresh()->permissions);
    }

    public function test_an_admin_saving_permissions_onto_a_customer_stores_none(): void
    {
        $customer = User::factory()->create(['role' => Roles::CUSTOMER]);

        $this->actingAs($this->admin())
            ->putJson("/api/users/{$customer->id}", [
                'name' => $customer->name,
                'permissions' => ['*'],
            ])
            ->assertOk();

        $this->assertNull($customer->fresh()->permissions);
    }

    public function test_a_customer_never_answers_yes_to_a_back_office_permission(): void
    {
        $customer = User::factory()->create(['role' => Roles::CUSTOMER]);
        // Even with a list written straight into the column.
        $customer->forceFill(['permissions' => ['*']])->save();

        $this->assertFalse($customer->fresh()->hasPermission('products.manage'));
    }

    // ---- shop sales against website orders -----------------------------

    private function order(array $attributes): Order
    {
        return Order::create(array_merge([
            'status' => 'pending',
            'subtotal' => 1000,
            'total_amount' => 1000,
        ], $attributes));
    }

    public function test_a_website_order_with_no_name_typed_is_still_a_website_order(): void
    {
        $this->order(['customer_name' => null, 'channel' => 'online']);

        $listed = $this->actingAs($this->admin())
            ->getJson('/api/orders?channel=online&page=1')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $listed);
    }

    public function test_a_till_sale_does_not_appear_among_website_orders(): void
    {
        $this->order(['customer_name' => 'POS Cash Sale', 'channel' => 'pos']);
        $this->order(['customer_name' => 'A customer', 'channel' => 'online']);

        $web = $this->actingAs($this->admin())
            ->getJson('/api/orders?channel=online&page=1')->assertOk()->json('data');
        $till = $this->actingAs($this->admin())
            ->getJson('/api/orders?channel=pos&page=1')->assertOk()->json('data');

        $this->assertCount(1, $web);
        $this->assertSame('A customer', $web[0]['customer_name']);
        $this->assertCount(1, $till);
    }

    public function test_every_order_lands_in_exactly_one_of_the_two_lists(): void
    {
        // The pairs the filter has to separate, including the awkward ones:
        // no name, no source recorded, and a till sale identifiable only by
        // what the cashier screen wrote into it.
        $this->order(['customer_name' => null, 'channel' => 'online']);
        $this->order(['customer_name' => 'POS Cash Sale', 'channel' => 'online']);
        $this->order(['customer_name' => 'Someone', 'channel' => 'online']);
        $this->order(['customer_name' => null, 'channel' => 'pos']);
        $this->order(['customer_name' => 'Walk-in', 'channel' => 'online', 'customer_email' => 'cashier@shop.local']);

        $admin = $this->admin();
        $web = $this->actingAs($admin)->getJson('/api/orders?channel=online&page=1')->json('total');
        $till = $this->actingAs($admin)->getJson('/api/orders?channel=pos&page=1')->json('total');

        $this->assertSame(5, $web + $till, 'no order may be counted twice or lost between the lists');
        $this->assertSame(2, $web);
        $this->assertSame(3, $till);
    }
}
