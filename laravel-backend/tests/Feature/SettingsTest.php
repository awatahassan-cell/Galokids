<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_out_visitor_cannot_write_settings(): void
    {
        $this->putJson('/api/settings', ['store_name' => 'Hacked'])
            ->assertUnauthorized();

        $this->assertDatabaseMissing('settings', ['key' => 'store_name']);
    }

    public function test_only_an_admin_can_write_settings(): void
    {
        $cashier = User::factory()->cashier()->create();
        $customer = User::factory()->create();

        $this->actingAs($cashier)->putJson('/api/settings', ['store_name' => 'Hacked'])
            ->assertForbidden();
        $this->actingAs($customer)->putJson('/api/settings', ['store_name' => 'Hacked'])
            ->assertForbidden();

        $this->assertDatabaseMissing('settings', ['key' => 'store_name']);
    }

    public function test_admin_can_store_and_read_back_settings(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->putJson('/api/settings', [
            'store_name' => 'Galo Kids',
            'store_logo' => 'https://example.com/logo.png',
        ])->assertOk();

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJson([
                'store_name' => 'Galo Kids',
                'store_logo' => 'https://example.com/logo.png',
            ]);
    }

    /**
     * Translation overrides are a nested object and can be long — the column
     * used to be varchar(255), which truncated them.
     */
    public function test_translation_overrides_survive_a_round_trip(): void
    {
        $admin = User::factory()->admin()->create();

        $overrides = [
            'en' => ['home' => 'Home page', 'products' => 'All products'],
            'ku' => ['home' => 'سەرەکی', 'products' => 'هەموو بەرهەمەکان'],
            'ar' => ['home' => 'الرئيسية'],
        ];

        // Pad it well past 255 characters to prove the column is wide enough.
        for ($i = 0; $i < 40; $i++) {
            $overrides['en']["filler_key_{$i}"] = "A reasonably long translated sentence number {$i}.";
        }

        $this->actingAs($admin)
            ->putJson('/api/settings', ['translation_overrides' => $overrides])
            ->assertOk();

        $stored = $this->getJson('/api/settings')->assertOk()->json('translation_overrides');

        $this->assertSame($overrides, $stored);
        $this->assertGreaterThan(255, strlen(json_encode($overrides)));
    }

    public function test_settings_are_public_to_read(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->putJson('/api/settings', ['store_name' => 'Galo Kids'])->assertOk();

        // A signed-out visitor needs the store name, logo and translations.
        $this->getJson('/api/settings')->assertOk()->assertJson(['store_name' => 'Galo Kids']);
    }
}
