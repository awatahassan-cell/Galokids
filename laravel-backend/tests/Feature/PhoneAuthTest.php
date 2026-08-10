<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhoneAuthTest extends TestCase
{
    use RefreshDatabase;

    /** Grab the verification token the OTP flow hands out for a number. */
    private function verifiedToken(string $phone): string
    {
        Cache::put('otp_' . $phone, ['code' => '111111', 'attempts' => 0], now()->addMinutes(5));

        $response = $this->postJson('/api/verify-otp', [
            'phone' => $phone,
            'code'  => '111111',
        ]);

        $response->assertOk();

        return $response->json('verification_token');
    }

    public function test_phone_login_requires_a_verification_token(): void
    {
        User::factory()->create(['phone' => '9647501234567', 'role' => Roles::CUSTOMER]);

        $this->postJson('/api/login-with-phone', ['phone' => '07501234567'])
            ->assertStatus(422);
    }

    public function test_phone_login_rejects_a_token_issued_for_another_number(): void
    {
        $token = $this->verifiedToken('9647500000000');

        $this->postJson('/api/login-with-phone', [
            'phone'              => '07501234567',
            'verification_token' => $token,
        ])->assertStatus(422);
    }

    public function test_verified_phone_creates_a_customer_and_returns_a_token(): void
    {
        $token = $this->verifiedToken('9647501234567');

        $response = $this->postJson('/api/login-with-phone', [
            'phone'              => '07501234567',
            'verification_token' => $token,
            'name'               => 'Awat',
        ]);

        $response->assertOk()->assertJsonStructure(['access_token', 'user']);
        $this->assertSame(Roles::CUSTOMER, (int) $response->json('user.role'));
        // Stored canonically, whichever format was typed.
        $this->assertDatabaseHas('users', ['phone' => '9647501234567', 'role' => Roles::CUSTOMER]);
    }

    public function test_a_verification_token_can_only_be_used_once(): void
    {
        $token = $this->verifiedToken('9647501234567');

        $this->postJson('/api/login-with-phone', [
            'phone'              => '07501234567',
            'verification_token' => $token,
        ])->assertOk();

        $this->postJson('/api/login-with-phone', [
            'phone'              => '07501234567',
            'verification_token' => $token,
        ])->assertStatus(422);
    }

    public function test_the_same_number_in_a_different_format_reuses_one_account(): void
    {
        $user = User::factory()->create(['phone' => '9647501234567', 'name' => 'Existing']);

        $token = $this->verifiedToken('9647501234567');

        $response = $this->postJson('/api/login-with-phone', [
            'phone'              => '+964 750 123 4567',
            'verification_token' => $token,
        ]);

        $response->assertOk();
        $this->assertSame($user->id, (int) $response->json('user.id'));
        $this->assertSame(1, User::where('phone', '9647501234567')->count());
    }

    public function test_login_does_not_auto_create_an_admin_for_a_known_email(): void
    {
        // There must be at least one user, otherwise the first-run bootstrap
        // legitimately creates the owner account.
        User::factory()->create(['email' => 'someone@example.com']);

        $this->postJson('/api/login', [
            'login'    => 'admin@galokids.com',
            'password' => 'whatever',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('users', ['email' => 'admin@galokids.com']);
    }

    public function test_password_login_works_with_a_phone_number(): void
    {
        User::factory()->create([
            'phone'    => '9647501112233',
            'password' => Hash::make('secret123'),
            'role'     => Roles::CASHIER,
        ]);

        $response = $this->postJson('/api/login', [
            'login'    => '07501112233',
            'password' => 'secret123',
        ]);

        $response->assertOk();
        $this->assertSame(Roles::CASHIER, (int) $response->json('user.role'));
    }

    public function test_phone_status_reports_whether_a_number_is_registered(): void
    {
        User::factory()->create(['phone' => '9647501234567', 'name' => 'Awat Hassan']);

        $this->postJson('/api/auth/phone-status', ['phone' => '07501234567'])
            ->assertOk()
            ->assertJson(['exists' => true, 'name' => 'Awat H.']);

        $this->postJson('/api/auth/phone-status', ['phone' => '07509999999'])
            ->assertOk()
            ->assertJson(['exists' => false]);
    }

    public function test_registering_an_already_registered_phone_is_rejected(): void
    {
        User::factory()->create(['phone' => '9647501234567']);

        $this->postJson('/api/register', [
            'name'  => 'Someone Else',
            'phone' => '07501234567',
        ])->assertStatus(422);
    }

    public function test_self_registration_always_creates_a_customer(): void
    {
        $response = $this->postJson('/api/register', [
            'name'                  => 'New Customer',
            'email'                 => 'new@example.com',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated();
        $this->assertSame(Roles::CUSTOMER, (int) $response->json('user.role'));
    }

    public function test_a_wrong_code_is_rejected_and_burned_after_five_attempts(): void
    {
        Cache::put('otp_9647501234567', ['code' => '111111', 'attempts' => 0], now()->addMinutes(5));

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/verify-otp', ['phone' => '9647501234567', 'code' => '000000'])
                ->assertStatus(422);
        }

        $this->postJson('/api/verify-otp', ['phone' => '9647501234567', 'code' => '000000'])
            ->assertStatus(429);

        // Even the correct code no longer works: the entry was burned.
        $this->postJson('/api/verify-otp', ['phone' => '9647501234567', 'code' => '111111'])
            ->assertStatus(422);
    }
}
