<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Two things that only show up outside a developer's machine.
 */
class DeploymentAndThrottlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_app_owns_the_service_provider_it_boots(): void
    {
        // bootstrap/providers.php named App\Providers\AppServiceProvider while
        // no such file existed here. The autoloader found the one that
        // laravel/pint ships under the same namespace, so the shop booted a
        // service provider out of a code formatter — and `composer install
        // --no-dev`, which is how this is deployed, leaves Pint out. The class
        // then does not exist and nothing boots at all.
        $file = (new \ReflectionClass(\App\Providers\AppServiceProvider::class))->getFileName();

        $this->assertStringNotContainsString(
            'vendor',
            $file,
            'the provider must be this application\'s own file, not one borrowed from a package'
        );
        $this->assertSame(
            realpath(app_path('Providers/AppServiceProvider.php')),
            realpath($file)
        );
    }

    public function test_every_provider_named_at_boot_is_loadable_without_dev_packages(): void
    {
        foreach (require base_path('bootstrap/providers.php') as $provider) {
            $file = (new \ReflectionClass($provider))->getFileName();

            $this->assertStringNotContainsString(
                '/vendor/',
                (string) $file,
                "{$provider} resolves into vendor/, so a --no-dev deploy may not find it"
            );
        }
    }

    public function test_the_sign_in_limit_counts_the_account_not_the_carrier(): void
    {
        // Iraqi carriers put thousands of customers behind a handful of public
        // addresses. Counted per IP, ten sign-ins a minute was ten for the
        // whole carrier — a dozen people opening the shop at once and most are
        // turned away.
        $limiter = RateLimiter::limiter('auth');
        $this->assertNotNull($limiter, 'the named limiter must be registered');

        $limits = $limiter(
            \Illuminate\Http\Request::create('/api/login', 'POST', ['login' => 'someone@example.com'])
        );

        $keys = array_map(fn ($limit) => $limit->key, $limits);

        $this->assertTrue(
            (bool) array_filter($keys, fn ($k) => str_contains($k, 'someone@example.com')),
            'one of the limits must count this account'
        );

        $perIp = array_values(array_filter($limits, fn ($l) => str_contains($l->key, 'auth-ip:')));
        $this->assertNotEmpty($perIp, 'a ceiling per address should still exist');
        $this->assertGreaterThanOrEqual(
            100,
            $perIp[0]->maxAttempts,
            'the per-address ceiling has to clear a whole carrier, not one customer'
        );
    }

    public function test_two_customers_on_one_address_do_not_block_each_other(): void
    {
        // Same IP for both, as on mobile data. Wrong passwords for the first
        // must not lock the second out.
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', ['login' => 'first@example.com', 'password' => 'wrong']);
        }

        $this->postJson('/api/login', ['login' => 'first@example.com', 'password' => 'wrong'])
            ->assertStatus(429);

        $this->postJson('/api/login', ['login' => 'second@example.com', 'password' => 'wrong'])
            ->assertStatus(422);
    }

    public function test_one_number_cannot_drain_the_sms_credit(): void
    {
        config(['services.otpiq.test_code' => '424242']);

        // The controller's own 45-second cooldown answers 429 from the second
        // request; the limiter is the outer guard. Either way the shop is not
        // billed for a flood.
        $this->postJson('/api/send-otp', ['phone' => '07701234567'])->assertOk();

        for ($i = 0; $i < 6; $i++) {
            $response = $this->postJson('/api/send-otp', ['phone' => '07701234567']);
        }

        $this->assertSame(429, $response->status());
    }
}
