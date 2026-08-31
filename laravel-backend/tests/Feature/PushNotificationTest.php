<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\PushSubscription;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Telling the shop about an order when nobody is looking at the panel.
 *
 * The in-page alert only fires while a tab is open and awake, which is not
 * when an order most needs noticing. These cover the part that works with the
 * browser closed: who may sign a browser up, who gets sent to, and that a
 * failure to notify can never cost the shop the order itself.
 */
class PushNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    private function subscriptionPayload(string $endpoint = 'https://fcm.googleapis.com/fcm/send/abc123'): array
    {
        return [
            'endpoint' => $endpoint,
            'keys' => [
                'p256dh' => 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM=',
                'auth' => 'tBHItJI5svbpez7KI4CCXg==',
            ],
        ];
    }

    private function variation(): ProductVariation
    {
        $product = Product::create(['name' => 'Tee', 'price' => 20000, 'cost' => 9000]);

        return ProductVariation::create([
            'product_id' => $product->id,
            'color' => 'Red',
            'size' => '2-3',
            'stock_quantity' => 20,
        ]);
    }

    // ---- who may sign a browser up -------------------------------------

    public function test_a_staff_browser_can_subscribe(): void
    {
        $staff = User::factory()->create(['role' => Roles::STAFF]);

        $this->actingAs($staff)
            ->postJson('/api/push/subscribe', $this->subscriptionPayload())
            ->assertCreated();

        $this->assertSame(1, PushSubscription::where('user_id', $staff->id)->count());
    }

    public function test_a_customer_cannot_subscribe(): void
    {
        // These carry order details — names, phone numbers, totals.
        $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->postJson('/api/push/subscribe', $this->subscriptionPayload())
            ->assertForbidden();

        $this->assertSame(0, PushSubscription::count());
    }

    public function test_a_stranger_cannot_subscribe(): void
    {
        $this->postJson('/api/push/subscribe', $this->subscriptionPayload())
            ->assertUnauthorized();
    }

    public function test_subscribing_the_same_browser_twice_keeps_one_row(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/push/subscribe', $this->subscriptionPayload())->assertCreated();
        $this->actingAs($admin)->postJson('/api/push/subscribe', $this->subscriptionPayload())->assertCreated();

        // Two rows would mean two copies of every notification on one screen.
        $this->assertSame(1, PushSubscription::count());
    }

    public function test_a_browser_can_be_unsubscribed(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/api/push/subscribe', $this->subscriptionPayload())->assertCreated();

        $this->actingAs($admin)
            ->postJson('/api/push/unsubscribe', ['endpoint' => $this->subscriptionPayload()['endpoint']])
            ->assertOk();

        $this->assertSame(0, PushSubscription::count());
    }

    public function test_one_person_cannot_unsubscribe_another_persons_browser(): void
    {
        $owner = $this->admin();
        $other = User::factory()->create(['role' => Roles::STAFF]);

        $this->actingAs($owner)->postJson('/api/push/subscribe', $this->subscriptionPayload())->assertCreated();

        $this->actingAs($other)
            ->postJson('/api/push/unsubscribe', ['endpoint' => $this->subscriptionPayload()['endpoint']])
            ->assertOk();

        // An endpoint is not a secret worth trusting on its own.
        $this->assertSame(1, PushSubscription::count());
    }

    // ---- what the browser is told --------------------------------------

    public function test_the_public_key_is_only_given_to_staff(): void
    {
        config(['services.webpush.public_key' => 'PUBLIC', 'services.webpush.private_key' => 'PRIVATE']);

        $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->getJson('/api/push/config')
            ->assertForbidden();

        $this->actingAs($this->admin())
            ->getJson('/api/push/config')
            ->assertOk()
            ->assertJson(['enabled' => true, 'public_key' => 'PUBLIC']);
    }

    public function test_push_reports_itself_as_off_when_no_keys_are_set(): void
    {
        config(['services.webpush.public_key' => null, 'services.webpush.private_key' => null]);

        $this->actingAs($this->admin())
            ->getJson('/api/push/config')
            ->assertOk()
            ->assertJson(['enabled' => false]);
    }

    public function test_the_private_key_is_never_sent_out(): void
    {
        config(['services.webpush.public_key' => 'PUBLIC', 'services.webpush.private_key' => 'SECRET-PRIVATE']);

        $body = $this->actingAs($this->admin())->getJson('/api/push/config')->assertOk()->json();

        $this->assertStringNotContainsString('SECRET-PRIVATE', json_encode($body));
    }

    public function test_a_subscriptions_keys_are_not_echoed_back(): void
    {
        $admin = $this->admin();
        $payload = $this->subscriptionPayload();

        $body = $this->actingAs($admin)->postJson('/api/push/subscribe', $payload)->assertCreated()->json();

        $this->assertStringNotContainsString($payload['keys']['auth'], json_encode($body));
    }

    // ---- an order must never fail because of a notification -------------

    public function test_an_order_is_still_saved_when_push_is_not_configured(): void
    {
        config(['services.webpush.public_key' => null, 'services.webpush.private_key' => null]);

        $variation = $this->variation();
        $customer = User::factory()->create(['role' => Roles::CUSTOMER]);

        $this->actingAs($customer)->postJson('/api/orders', [
            'customer_name' => 'A shopper',
            'customer_phone' => '07701234567',
            'shipping_address' => 'Erbil',
            'governorate' => 'Erbil',
            'status' => 'pending',
            'channel' => 'online',
            'payment_method' => 'cod',
            'items' => [[
                'product_id' => $variation->product_id,
                'product_variation_id' => $variation->id,
                'quantity' => 1,
            ]],
        ])->assertCreated();
    }

    public function test_a_speed_hint_from_the_library_does_not_abort_a_send(): void
    {
        // The push library raises an E_USER_NOTICE the first time it runs
        // without GMP or BCMath. Laravel turns notices into exceptions, which
        // aborted the whole send — so the first order after every deploy
        // notified nobody, and the second worked, because the library only
        // says it once per process.
        $notifier = app(\App\Services\PushNotifier::class);

        $result = $notifier->toleratingNotices(function (): int {
            trigger_error('It is highly recommended to install the GMP extension', E_USER_NOTICE);

            return 7;
        });

        $this->assertSame(7, $result, 'a notice must not stop the send it was raised during');
    }

    public function test_a_real_failure_during_a_send_is_still_caught(): void
    {
        // Tolerating notices must not turn into tolerating everything: a
        // genuine error still has to be swallowed by dispatch and reported as
        // "nothing delivered", never thrown at the order that triggered it.
        $notifier = app(\App\Services\PushNotifier::class);

        $threw = false;
        try {
            $notifier->toleratingNotices(function (): int {
                throw new \RuntimeException('push service exploded');
            });
        } catch (\RuntimeException $e) {
            $threw = true;
        }

        $this->assertTrue($threw, 'a real error must still surface to dispatch, which logs it');
    }

    public function test_an_order_is_still_saved_when_the_push_service_is_unreachable(): void
    {
        // Keys present, so a send is genuinely attempted and genuinely fails.
        config([
            'services.webpush.public_key' => 'BAbZCSZztMPi_ducUy44j3h0_P1W5v3RgaeU8zlfgU7oQEpFI-BOnXgH759VTx3MOpfWiqwbkHIYyjhfZEWcH9I',
            'services.webpush.private_key' => 'RUGo7BXsN0rd_Lh2MHasPeD7JFJduYx49B1L4x5uczc',
        ]);

        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/api/push/subscribe', $this->subscriptionPayload())->assertCreated();

        $variation = $this->variation();
        $customer = User::factory()->create(['role' => Roles::CUSTOMER]);

        $this->actingAs($customer)->postJson('/api/orders', [
            'customer_name' => 'A shopper',
            'customer_phone' => '07701234567',
            'shipping_address' => 'Erbil',
            'governorate' => 'Erbil',
            'status' => 'pending',
            'channel' => 'online',
            'payment_method' => 'cod',
            'items' => [[
                'product_id' => $variation->product_id,
                'product_variation_id' => $variation->id,
                'quantity' => 1,
            ]],
        ])->assertCreated();
    }
}
