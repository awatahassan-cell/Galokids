<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A product taken off the website stays off it.
 *
 * The switch filtered the listing only when the caller asked it to. A stranger
 * adding `?include_inactive=1` got the hidden products back, `?is_active=0`
 * handed them a list of exactly what the shop had taken down, and either way
 * the product was still served in full at its own address.
 */
class ProductVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function hidden(): Product
    {
        return Product::create([
            'name' => 'Unreleased Jacket',
            'price' => 90000,
            'cost' => 1,
            'gender' => 0,
            'is_active' => false,
        ]);
    }

    private function shown(): Product
    {
        return Product::create([
            'name' => 'On Sale Tee',
            'price' => 10000,
            'cost' => 1,
            'gender' => 0,
            'is_active' => true,
        ]);
    }

    /** @return list<string> */
    private function publicNames(string $query = ''): array
    {
        $body = $this->getJson('/api/products' . $query)->assertOk()->json();

        return array_column($body['data'] ?? $body, 'name');
    }

    public function test_a_shopper_cannot_ask_for_the_hidden_products(): void
    {
        $this->hidden();
        $this->shown();

        foreach (['', '?include_inactive=1', '?all=1', '?is_active=0', '?is_active=all'] as $query) {
            $this->assertSame(
                ['On Sale Tee'],
                $this->publicNames($query),
                "a stranger should see only the active product, asking with '{$query}'"
            );
        }
    }

    public function test_a_signed_in_customer_cannot_either(): void
    {
        $this->hidden();
        $this->shown();

        $body = $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->getJson('/api/products?include_inactive=1')->assertOk()->json();

        $this->assertSame(['On Sale Tee'], array_column($body['data'] ?? $body, 'name'));
    }

    public function test_the_hidden_product_is_not_served_at_its_own_address(): void
    {
        $hidden = $this->hidden();

        // Its id is one more than its neighbour's, so the listing filter alone
        // was never going to be enough.
        $this->getJson("/api/products/{$hidden->id}")->assertNotFound();
    }

    public function test_the_back_office_can_still_see_and_open_them(): void
    {
        $hidden = $this->hidden();
        $this->shown();

        $admin = User::factory()->create(['role' => Roles::ADMIN]);

        $listed = $this->actingAs($admin)
            ->getJson('/api/products?include_inactive=1')->assertOk()->json();
        $this->assertEqualsCanonicalizing(
            ['On Sale Tee', 'Unreleased Jacket'],
            array_column($listed['data'] ?? $listed, 'name')
        );

        $onlyHidden = $this->actingAs($admin)
            ->getJson('/api/products?is_active=0')->assertOk()->json();
        $this->assertSame(['Unreleased Jacket'], array_column($onlyHidden['data'] ?? $onlyHidden, 'name'));

        $this->actingAs($admin)->getJson("/api/products/{$hidden->id}")->assertOk();
    }

    public function test_the_panel_lists_the_hidden_ones_by_default(): void
    {
        // The switch that turns a product back on lives on its row. Filter the
        // deactivated ones out of the panel's default list and the product
        // disappears from the only screen that could restore it — nothing in
        // the panel asks for them with a query parameter. The inventory audit
        // and the purchases picker read this same list and need the hidden
        // stock counted too.
        $this->hidden();
        $this->shown();

        $body = $this->actingAs(User::factory()->create(['role' => Roles::ADMIN]))
            ->getJson('/api/products')->assertOk()->json();

        $this->assertEqualsCanonicalizing(
            ['On Sale Tee', 'Unreleased Jacket'],
            array_column($body['data'] ?? $body, 'name')
        );
    }

    public function test_the_homepage_strip_does_not_carry_a_hidden_product(): void
    {
        // best-sellers tops itself up with the newest products, so a product
        // deactivated a moment ago went straight to the front of the homepage.
        $this->hidden();
        $this->shown();

        $public = $this->getJson('/api/products/best-sellers')->assertOk()->json();
        $this->assertSame(['On Sale Tee'], array_column($public, 'name'));

        $staff = $this->actingAs(User::factory()->create(['role' => Roles::ADMIN]))
            ->getJson('/api/products/best-sellers')->assertOk()->json();
        $this->assertEqualsCanonicalizing(
            ['On Sale Tee', 'Unreleased Jacket'],
            array_column($staff, 'name')
        );
    }

    public function test_a_category_does_not_hand_out_its_hidden_products(): void
    {
        $category = \App\Models\Category::create(['name' => 'Jackets']);
        $this->hidden()->forceFill(['category_id' => $category->id])->save();
        $this->shown()->forceFill(['category_id' => $category->id])->save();

        $public = $this->getJson("/api/categories/{$category->id}")->assertOk()->json();
        $this->assertSame(['On Sale Tee'], array_column($public['products'], 'name'));

        $staff = $this->actingAs(User::factory()->create(['role' => Roles::ADMIN]))
            ->getJson("/api/categories/{$category->id}")->assertOk()->json();
        $this->assertEqualsCanonicalizing(
            ['On Sale Tee', 'Unreleased Jacket'],
            array_column($staff['products'], 'name')
        );
    }

    public function test_a_product_created_without_touching_the_switch_is_visible(): void
    {
        // The column is NOT NULL with `default(true)`, so every product that
        // existed before the switch was added became visible on migration
        // rather than vanishing from the shop — and a new one is visible
        // unless somebody turns it off.
        $product = Product::create([
            'name' => 'Plain Shirt',
            'price' => 5000,
            'cost' => 1,
            'gender' => 0,
        ]);

        $this->assertTrue((bool) $product->fresh()->is_active);
        $this->assertSame(['Plain Shirt'], $this->publicNames());
        $this->getJson("/api/products/{$product->id}")->assertOk();
    }
}
