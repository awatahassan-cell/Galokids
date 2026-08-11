<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BulkActionTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsSanctum(User $user): self
    {
        Sanctum::actingAs($user);
        return $this;
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    /* ---------------------------------------------------------- access --- */

    public function test_a_customer_cannot_bulk_delete_products(): void
    {
        $product = Product::create(['name' => 'Shirt', 'price' => 10000]);

        $this->actingAsSanctum(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->postJson('/api/bulk/products', ['ids' => [$product->id]])
            ->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_a_cashier_cannot_bulk_delete_products(): void
    {
        $product = Product::create(['name' => 'Shirt', 'price' => 10000]);

        $this->actingAsSanctum(User::factory()->create(['role' => Roles::CASHIER]))
            ->postJson('/api/bulk/products', ['ids' => [$product->id]])
            ->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_staff_cannot_bulk_delete_orders(): void
    {
        $order = Order::create(['status' => 'pending', 'total_amount' => 1000]);

        $this->actingAsSanctum(User::factory()->create(['role' => Roles::STAFF]))
            ->postJson('/api/bulk/orders', ['ids' => [$order->id]])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_an_admin_can_bulk_delete_products(): void
    {
        $a = Product::create(['name' => 'A', 'price' => 1000]);
        $b = Product::create(['name' => 'B', 'price' => 2000]);
        $keep = Product::create(['name' => 'Keep', 'price' => 3000]);

        $this->actingAsSanctum($this->admin())
            ->postJson('/api/bulk/products', ['ids' => [$a->id, $b->id]])
            ->assertOk()
            ->assertJson(['deleted' => 2]);

        $this->assertDatabaseMissing('products', ['id' => $a->id]);
        $this->assertDatabaseMissing('products', ['id' => $b->id]);
        $this->assertDatabaseHas('products', ['id' => $keep->id]);
    }

    /* ------------------------------------------------------- user rules --- */

    public function test_an_admin_cannot_bulk_delete_their_own_account(): void
    {
        $admin = $this->admin();
        $other = User::factory()->create(['role' => Roles::CUSTOMER]);

        $response = $this->actingAsSanctum($admin)
            ->postJson('/api/bulk/users', ['ids' => [$admin->id, $other->id]])
            ->assertOk()
            ->assertJson(['deleted' => 1]);

        $this->assertSame('self', $response->json('skipped.0.reason'));
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertDatabaseMissing('users', ['id' => $other->id]);
    }

    public function test_the_last_admin_survives_a_bulk_delete(): void
    {
        $actor = $this->admin();
        $second = User::factory()->create(['role' => Roles::ADMIN]);
        $third = User::factory()->create(['role' => Roles::ADMIN]);

        // Selecting every other admin would leave only the actor, which is
        // allowed — the shop still has an admin.
        $this->actingAsSanctum($actor)
            ->postJson('/api/bulk/users', ['ids' => [$second->id, $third->id]])
            ->assertOk()
            ->assertJson(['deleted' => 2]);

        $this->assertSame(1, User::where('role', Roles::ADMIN)->count());
    }

    public function test_a_selection_cannot_remove_every_admin(): void
    {
        $actor = $this->admin();
        $second = User::factory()->create(['role' => Roles::ADMIN]);

        // The actor is skipped as self; without a budget guard the remaining
        // admin would go too. One must survive.
        $this->actingAsSanctum($actor)
            ->postJson('/api/bulk/users', ['ids' => [$actor->id, $second->id]])
            ->assertOk();

        $this->assertGreaterThanOrEqual(1, User::where('role', Roles::ADMIN)->count());
    }

    /* --------------------------------------------------------- category --- */

    public function test_a_category_that_still_holds_products_is_refused(): void
    {
        $busy = Category::create(['name' => 'Girls']);
        $empty = Category::create(['name' => 'Empty']);
        Product::create(['name' => 'Dress', 'price' => 5000, 'category_id' => $busy->id]);

        $response = $this->actingAsSanctum($this->admin())
            ->postJson('/api/bulk/categories', ['ids' => [$busy->id, $empty->id]])
            ->assertOk()
            ->assertJson(['deleted' => 1]);

        $this->assertSame('has_products', $response->json('skipped.0.reason'));
        $this->assertDatabaseHas('categories', ['id' => $busy->id]);
        $this->assertDatabaseMissing('categories', ['id' => $empty->id]);
    }

    /* ----------------------------------------------------- order status --- */

    public function test_an_admin_can_move_several_orders_to_one_status(): void
    {
        $a = Order::create(['status' => 'pending', 'total_amount' => 1000]);
        $b = Order::create(['status' => 'pending', 'total_amount' => 2000]);

        $this->actingAsSanctum($this->admin())
            ->postJson('/api/bulk/orders/status', [
                'ids' => [$a->id, $b->id],
                'status' => 'shipped',
            ])
            ->assertOk()
            ->assertJson(['updated' => 2]);

        $this->assertSame('shipped', $a->fresh()->status);
        $this->assertSame('shipped', $b->fresh()->status);
    }

    public function test_a_cashier_cannot_move_orders_in_bulk(): void
    {
        $order = Order::create(['status' => 'pending', 'total_amount' => 1000]);

        $this->actingAsSanctum(User::factory()->create(['role' => Roles::CASHIER]))
            ->postJson('/api/bulk/orders/status', ['ids' => [$order->id], 'status' => 'delivered'])
            ->assertForbidden();

        $this->assertSame('pending', $order->fresh()->status);
    }

    /* ------------------------------------------------------------ input --- */

    public function test_an_empty_selection_is_rejected(): void
    {
        $this->actingAsSanctum($this->admin())
            ->postJson('/api/bulk/products', ['ids' => []])
            ->assertStatus(422);
    }

    public function test_a_selection_larger_than_the_cap_is_rejected(): void
    {
        $this->actingAsSanctum($this->admin())
            ->postJson('/api/bulk/products', ['ids' => range(1, 501)])
            ->assertStatus(422);
    }
}
