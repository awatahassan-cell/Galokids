<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * What the API promises a client that is not this website.
 *
 * A phone app has no page of its own: it cannot resolve a relative URL against
 * anything, and whatever the API puts in `message` is what it shows the
 * shopper. Both were written as though the browser on galokids.com were the
 * only caller there would ever be.
 */
class ApiClientContractTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'https://api.galokids.com']);
    }

    private function product(array $attributes = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Kids Tee',
            'price' => 10000,
            'cost' => 4000,
            'gender' => 0,
        ], $attributes));
    }

    public function test_a_stored_image_path_comes_back_as_a_whole_url(): void
    {
        // "/uploads/products/p1.jpg" resolves against the page the browser is
        // on — the storefront, not this API — so the images 404 as soon as the
        // two live on different hosts, and an app cannot show them at all.
        $this->product([
            'image_url' => '/uploads/products/p1.jpg',
            'images' => ['/uploads/products/p1.jpg', 'uploads/products/p2.jpg'],
        ]);

        $body = $this->getJson('/api/products')->assertOk()->json();
        $product = ($body['data'] ?? $body)[0];

        $this->assertSame('https://api.galokids.com/uploads/products/p1.jpg', $product['image_url']);
        $this->assertSame([
            'https://api.galokids.com/uploads/products/p1.jpg',
            'https://api.galokids.com/uploads/products/p2.jpg',
        ], $product['images']);
    }

    public function test_an_image_that_already_stands_on_its_own_is_left_alone(): void
    {
        // A product may point at a CDN, at the shop's Instagram, or carry an
        // inline data: URI. Rewriting any of those breaks it.
        $product = $this->product([
            'image_url' => 'https://cdn.example.com/x.jpg',
            'images' => [
                'https://cdn.example.com/x.jpg',
                '//other.cdn/y.png',
                'data:image/gif;base64,R0lGOD',
            ],
        ]);

        $body = $this->getJson("/api/products/{$product->id}")->assertOk()->json();

        $this->assertSame('https://cdn.example.com/x.jpg', $body['image_url']);
        $this->assertSame([
            'https://cdn.example.com/x.jpg',
            '//other.cdn/y.png',
            'data:image/gif;base64,R0lGOD',
        ], $body['images']);
    }

    public function test_a_product_with_no_image_says_so_rather_than_pointing_at_the_api_root(): void
    {
        $product = $this->product(['image_url' => null, 'images' => []]);

        $body = $this->getJson("/api/products/{$product->id}")->assertOk()->json();

        $this->assertNull($body['image_url']);
        $this->assertSame([], $body['images']);
    }

    public function test_a_missing_record_does_not_name_the_framework(): void
    {
        // "No query results for model [App\Models\Product] 99999" is what an
        // app would put in front of a shopper, and it tells a stranger the
        // framework, the namespace and the class.
        $body = $this->getJson('/api/products/99999')->assertNotFound()->json();

        $this->assertStringNotContainsString('App\\Models', json_encode($body));
        $this->assertStringNotContainsString('query results', json_encode($body));
        $this->assertSame('not_found', $body['error']);
    }

    public function test_an_unknown_route_answers_the_same_way(): void
    {
        $body = $this->getJson('/api/no-such-thing')->assertNotFound()->json();

        $this->assertSame('not_found', $body['error']);
    }

    public function test_the_back_office_still_gets_the_cost_with_absolute_images(): void
    {
        $this->product(['image_url' => '/uploads/products/p1.jpg']);

        $body = $this->actingAs(User::factory()->create(['role' => Roles::ADMIN]))
            ->getJson('/api/products')->assertOk()->json();
        $product = ($body['data'] ?? $body)[0];

        $this->assertSame(4000.0, (float) $product['cost']);
        $this->assertSame('https://api.galokids.com/uploads/products/p1.jpg', $product['image_url']);
    }
}
