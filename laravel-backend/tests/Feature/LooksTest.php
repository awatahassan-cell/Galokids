<?php

namespace Tests\Feature;

use App\Models\Look;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * "Try the Look": what a shopper may see, and who may change it.
 */
class LooksTest extends TestCase
{
    use RefreshDatabase;

    private function product(string $name, bool $active = true): Product
    {
        $product = Product::create(['name' => $name, 'price' => 20000, 'gender' => 0, 'is_active' => $active]);
        ProductVariation::create(['product_id' => $product->id, 'color' => 'Red', 'size' => '4-5', 'stock_quantity' => 3, 'sku' => 'S-' . $product->id]);

        return $product;
    }

    private function payload(array $products, array $extra = []): array
    {
        return array_merge([
            'title' => 'Autumn',
            'title_ku' => 'پایز',
            'gender' => 1,
            'age_range' => '4-6',
            'image_url' => '/uploads/looks/a.png',
            'items' => array_map(fn ($p, $i) => [
                'product_id' => $p->id, 'slot' => ['top', 'bottom', 'shoes'][$i] ?? 'other',
                'hotspot_x' => 50, 'hotspot_y' => 30 + $i * 25,
            ], $products, array_keys($products)),
        ], $extra);
    }

    public function test_an_admin_creates_a_look_with_its_pieces_in_order(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $top = $this->product('Hoodie');
        $bottom = $this->product('Jeans');

        $look = $this->actingAs($admin)->postJson('/api/looks', $this->payload([$top, $bottom]))
            ->assertCreated()->json();

        $this->assertSame('Autumn', $look['title']);
        $this->assertCount(2, $look['items']);
        $this->assertSame('top', $look['items'][0]['slot']);
        $this->assertSame($top->id, $look['items'][0]['product']['id']);
        // A product comes with its variations, so the page can offer colours and sizes.
        $this->assertCount(1, $look['items'][0]['product']['variations']);
        $this->assertStringStartsWith('http', $look['image_url']);
    }

    public function test_a_look_needs_a_picture_and_at_least_one_real_product(): void
    {
        $admin = User::factory()->create(['role' => 1]);

        $this->actingAs($admin)->postJson('/api/looks', ['title' => 'x', 'items' => []])->assertStatus(422);
        $this->actingAs($admin)->postJson('/api/looks', $this->payload([$this->product('A')], ['image_url' => '']))
            ->assertStatus(422);
        $this->actingAs($admin)->postJson('/api/looks', [
            'title' => 'x', 'image_url' => '/a.png', 'items' => [['product_id' => 99999]],
        ])->assertStatus(422);
    }

    private function makeLook(string $title, array $products, bool $active = true): Look
    {
        $look = Look::create(['title' => $title, 'image_url' => '/a.png', 'is_active' => $active]);
        foreach ($products as $i => $product) {
            $look->items()->create(['product_id' => $product->id, 'slot' => 'top', 'sort_order' => $i]);
        }

        return $look;
    }

    public function test_shoppers_see_only_active_looks_and_only_products_still_on_the_website(): void
    {
        $shown = $this->product('Shown');
        $hidden = $this->product('Hidden', active: false);

        $this->makeLook('Autumn', [$shown, $hidden]);
        $this->makeLook('Only hidden', [$hidden]);
        $this->makeLook('Switched off', [$shown], active: false);

        // A stranger: one look, and inside it only the product still on the website.
        $public = $this->getJson('/api/looks')->assertOk()->json();
        $this->assertCount(1, $public);
        $this->assertSame('Autumn', $public[0]['title']);
        $this->assertCount(1, $public[0]['items']);
        $this->assertSame('Shown', $public[0]['items'][0]['product']['name']);
        $this->assertArrayNotHasKey('cost', $public[0]['items'][0]['product']);

        // Asking for everything does not help a stranger.
        $this->assertCount(1, $this->getJson('/api/looks?all=1')->json());

        // The back office can see all three, hidden pieces included.
        $admin = User::factory()->create(['role' => 1]);
        $all = $this->actingAs($admin)->getJson('/api/looks?all=1')->assertOk()->json();
        $this->assertCount(3, $all);
    }

    public function test_update_replaces_the_pieces_and_reorder_sets_the_order(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $a = $this->product('A');
        $b = $this->product('B');

        $first = $this->actingAs($admin)->postJson('/api/looks', $this->payload([$a]))->json();
        $second = $this->actingAs($admin)->postJson('/api/looks', $this->payload([$a], ['title' => 'Second']))->json();

        $updated = $this->actingAs($admin)->putJson("/api/looks/{$first['id']}", $this->payload([$b], ['title' => 'Renamed']))
            ->assertOk()->json();
        $this->assertSame('Renamed', $updated['title']);
        $this->assertSame($b->id, $updated['items'][0]['product_id']);
        $this->assertCount(1, $updated['items']);

        $this->actingAs($admin)->postJson('/api/looks/reorder', ['ids' => [$second['id'], $first['id']]])->assertOk();
        $order = collect($this->actingAs($admin)->getJson('/api/looks?all=1')->json())->pluck('id')->all();
        $this->assertSame([$second['id'], $first['id']], $order);
    }

    public function test_deleting_a_product_takes_it_out_of_its_looks_and_a_look_can_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 1]);
        $a = $this->product('A');
        $b = $this->product('B');

        $look = $this->actingAs($admin)->postJson('/api/looks', $this->payload([$a, $b]))->json();
        $a->delete();

        $items = $this->actingAs($admin)->getJson('/api/looks?all=1')->json()[0]['items'];
        $this->assertCount(1, $items);

        $this->actingAs($admin)->deleteJson("/api/looks/{$look['id']}")->assertNoContent();
        $this->assertSame(0, Look::count());
    }

    public function test_only_staff_who_manage_products_may_change_looks(): void
    {
        $product = $this->product('A');
        $customer = User::factory()->create(['role' => 0]);

        $this->postJson('/api/looks', $this->payload([$product]))->assertUnauthorized();
        $this->actingAs($customer)->postJson('/api/looks', $this->payload([$product]))->assertForbidden();
    }
}
