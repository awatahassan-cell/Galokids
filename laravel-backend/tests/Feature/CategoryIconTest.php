<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The icon a shop picks for a category.
 *
 * The panel has offered an icon picker all along and the model has always
 * listed `icon` as fillable — but no migration ever added the column, so the
 * value had nowhere to go. Choosing an icon and pressing save did not quietly
 * lose the choice; it failed the whole request.
 */
class CategoryIconTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    public function test_a_category_can_be_created_with_an_icon(): void
    {
        $response = $this->actingAs($this->admin())->postJson('/api/categories', [
            'name' => 'Dresses',
            'name_ku' => 'کراس',
            'slug' => 'dresses',
            'icon' => 'dress',
        ])->assertCreated();

        $this->assertSame('dress', $response->json('icon'));
        $this->assertSame('dress', Category::first()->icon);
    }

    public function test_the_icon_can_be_changed_afterwards(): void
    {
        $category = Category::create(['name' => 'Toys', 'slug' => 'toys', 'icon' => 'toy']);

        $this->actingAs($this->admin())
            ->putJson("/api/categories/{$category->id}", ['icon' => 'teddy'])
            ->assertOk();

        $this->assertSame('teddy', $category->fresh()->icon);
    }

    public function test_clearing_the_icon_leaves_the_category_alone(): void
    {
        // An empty icon is a valid answer: the storefront then reads the
        // category's own name and picks something sensible.
        $category = Category::create(['name' => 'Shoes', 'slug' => 'shoes', 'icon' => 'shoes']);

        $this->actingAs($this->admin())
            ->putJson("/api/categories/{$category->id}", ['icon' => ''])
            ->assertOk();

        $this->assertSame('', (string) $category->fresh()->icon);
        $this->assertSame('Shoes', $category->fresh()->name);
    }

    public function test_the_icon_comes_back_with_the_category_list(): void
    {
        Category::create(['name' => 'Bags', 'slug' => 'bags', 'icon' => 'bag']);

        $listed = $this->getJson('/api/categories')->assertOk()->json();

        $this->assertSame('bag', collect($listed)->firstWhere('name', 'Bags')['icon']);
    }

    public function test_a_customer_cannot_rename_the_shop_s_categories(): void
    {
        $category = Category::create(['name' => 'Toys', 'slug' => 'toys']);

        $this->actingAs(User::factory()->create())
            ->putJson("/api/categories/{$category->id}", ['icon' => 'teddy'])
            ->assertForbidden();
    }
}
