<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What a stranger can read from the shop.
 *
 * `/api/products` is public — the storefront needs it — and it was answering
 * with `cost` on every item. Anyone at all could read what Galokids pays for
 * each product and work out its margin to the dinar.
 */
class PublicDataExposureTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create([
            'name' => 'Kids Tee',
            'price' => 33000,
            'cost' => 12000,
            'gender' => 0,
        ]);
    }

    public function test_the_public_product_list_does_not_say_what_the_shop_paid(): void
    {
        $this->product();

        $body = $this->getJson('/api/products')->assertOk()->json();

        $this->assertArrayNotHasKey('cost', $body[0]);
        $this->assertStringNotContainsString('12000', json_encode($body));
    }

    public function test_a_single_public_product_does_not_either(): void
    {
        $product = $this->product();

        $body = $this->getJson("/api/products/{$product->id}")->assertOk()->json();

        $this->assertArrayNotHasKey('cost', $body);
    }

    public function test_a_signed_in_customer_is_still_a_stranger_to_it(): void
    {
        $this->product();

        $body = $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->getJson('/api/products')->assertOk()->json();

        $this->assertArrayNotHasKey('cost', $body[0]);
    }

    public function test_the_back_office_still_gets_it(): void
    {
        $this->product();

        // Margins, stock valuation and the profit report all need the figure.
        foreach ([Roles::ADMIN, Roles::CASHIER, Roles::STAFF] as $role) {
            $body = $this->actingAs(User::factory()->create(['role' => $role]))
                ->getJson('/api/products')->assertOk()->json();

            $this->assertSame(12000.0, (float) $body[0]['cost'], "role {$role} should see cost");
        }
    }
}
