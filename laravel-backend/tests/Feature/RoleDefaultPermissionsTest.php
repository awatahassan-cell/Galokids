<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What a back-office account may do before anyone has ticked its boxes.
 *
 * The permission check used to run only once an admin had saved an explicit
 * list. Until then every cashier and staff account passed everything the API
 * offered, so a cashier hired for the till could delete the shop's catalogue —
 * and ticking the first box was what took access away rather than granting it.
 */
class RoleDefaultPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function user(int $role, ?array $permissions = null): User
    {
        return User::factory()->create(['role' => $role, 'permissions' => $permissions]);
    }

    public function test_a_cashier_with_nothing_saved_cannot_delete_a_product(): void
    {
        $product = \App\Models\Product::create(['name' => 'Tee', 'price' => 100, 'cost' => 1, 'gender' => 0]);

        $this->actingAs($this->user(Roles::CASHIER))
            ->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();

        $this->assertNotNull($product->fresh(), 'the catalogue should survive a cashier');
    }

    public function test_a_cashier_with_nothing_saved_cannot_read_the_profit_reports(): void
    {
        $this->actingAs($this->user(Roles::CASHIER))
            ->getJson('/api/reports/sales')
            ->assertForbidden();
    }

    public function test_a_cashier_with_nothing_saved_can_still_work_the_till(): void
    {
        // The point of the defaults: turning the check on must not lock out
        // accounts that predate the permissions screen.
        $this->actingAs($this->user(Roles::CASHIER))
            ->getJson('/api/orders?channel=pos&page=1')
            ->assertOk();
    }

    public function test_a_staff_account_with_nothing_saved_can_manage_the_catalogue(): void
    {
        // The panel's warehouse preset offers this, so the API must agree —
        // otherwise the screen shows a form that cannot save.
        $this->actingAs($this->user(Roles::STAFF))
            ->postJson('/api/products', ['name' => 'Restocked', 'price' => 1000])
            ->assertCreated();
    }

    public function test_a_staff_account_with_nothing_saved_still_cannot_delete_products(): void
    {
        $product = \App\Models\Product::create(['name' => 'Tee', 'price' => 100, 'cost' => 1, 'gender' => 0]);

        $this->actingAs($this->user(Roles::STAFF))
            ->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();
    }

    public function test_the_saved_list_is_what_counts_once_it_exists(): void
    {
        $this->actingAs($this->user(Roles::STAFF, ['products.view']))
            ->postJson('/api/products', ['name' => 'Not allowed', 'price' => 1000])
            ->assertForbidden();

        $this->actingAs($this->user(Roles::STAFF, ['products.view', 'products.manage']))
            ->postJson('/api/products', ['name' => 'Allowed', 'price' => 1000])
            ->assertCreated();
    }

    public function test_an_admin_needs_no_list_at_all(): void
    {
        $product = \App\Models\Product::create(['name' => 'Tee', 'price' => 100, 'cost' => 1, 'gender' => 0]);

        $this->actingAs($this->user(Roles::ADMIN))
            ->deleteJson("/api/products/{$product->id}")
            ->assertNoContent();
    }
}
