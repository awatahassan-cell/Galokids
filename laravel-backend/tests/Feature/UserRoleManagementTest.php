<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRoleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_create_a_customer_with_only_a_phone_number(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->postJson('/api/users', [
            'name'  => 'Walk-in Customer',
            'phone' => '0750 111 2233',
            'role'  => Roles::CUSTOMER,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', ['phone' => '9647501112233', 'role' => Roles::CUSTOMER]);
    }

    public function test_a_cashier_cannot_create_an_admin(): void
    {
        $cashier = User::factory()->cashier()->create();

        $this->actingAs($cashier)->postJson('/api/users', [
            'name'     => 'Sneaky',
            'email'    => 'sneaky@example.com',
            'role'     => Roles::ADMIN,
            'password' => 'password123',
        ])->assertForbidden();
    }

    public function test_a_cashier_cannot_promote_themselves(): void
    {
        $cashier = User::factory()->cashier()->create();

        $this->actingAs($cashier)->putJson("/api/users/{$cashier->id}", [
            'name' => $cashier->name,
            'role' => Roles::ADMIN,
        ])->assertForbidden();

        $this->assertSame(Roles::CASHIER, (int) $cashier->fresh()->role);
    }

    public function test_a_cashier_cannot_delete_an_admin(): void
    {
        $cashier = User::factory()->cashier()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($cashier)->deleteJson("/api/users/{$admin->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_the_last_admin_cannot_be_demoted_or_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->admin()->create();

        // Two admins: demoting one is fine.
        $this->actingAs($admin)->putJson("/api/users/{$other->id}", [
            'name' => $other->name,
            'role' => Roles::CASHIER,
        ])->assertOk();

        // Now only one admin is left — a second admin has to delete it, since
        // deleting your own account is refused separately.
        $helper = User::factory()->admin()->create();
        $this->actingAs($helper)->putJson("/api/users/{$admin->id}", [
            'name' => $admin->name,
            'role' => Roles::CUSTOMER,
        ])->assertOk();

        $this->actingAs($helper)->deleteJson("/api/users/{$helper->id}")
            ->assertStatus(400);
    }

    public function test_a_customer_cannot_reach_user_management_at_all(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/users')->assertForbidden();
        $this->actingAs($customer)->postJson('/api/users', [
            'name' => 'x', 'email' => 'x@example.com', 'role' => 0,
        ])->assertForbidden();
    }

    public function test_an_admin_can_manage_products(): void
    {
        // Regression: the product guard used to accept only roles 2 and 3, so
        // the admin (role 1) was locked out of their own catalogue.
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/products', [
            'name'  => 'Test Product',
            'price' => 15000,
        ])->assertCreated();
    }

    public function test_a_customer_cannot_manage_products(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/products', [
            'name'  => 'Test Product',
            'price' => 15000,
        ])->assertForbidden();
    }

    public function test_roles_normalizes_unknown_values_to_customer(): void
    {
        $this->assertSame(Roles::ADMIN, Roles::normalize('admin'));
        $this->assertSame(Roles::CASHIER, Roles::normalize('2'));
        $this->assertSame(Roles::STAFF, Roles::normalize(3));
        $this->assertSame(Roles::CUSTOMER, Roles::normalize('superuser'));
        $this->assertSame(Roles::CUSTOMER, Roles::normalize(null));
        $this->assertSame(Roles::CUSTOMER, Roles::normalize(99));
    }
}
