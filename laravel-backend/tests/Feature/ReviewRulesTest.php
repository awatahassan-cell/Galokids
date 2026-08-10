<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewRulesTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create(['name' => 'Shirt', 'price' => 10000]);
    }

    private function actingAsSanctum(User $user): self
    {
        Sanctum::actingAs($user);

        return $this;
    }

    private function actingAsCustomer(): self
    {
        return $this->actingAsSanctum(User::factory()->create());
    }

    public function test_a_customer_holds_one_review_per_product(): void
    {
        $customer = User::factory()->create();
        $product = $this->product();

        $this->actingAsSanctum($customer)->postJson('/api/reviews', [
            'product_id' => $product->id, 'rating' => 5, 'comment' => 'Great',
        ])->assertCreated();

        // Reviewing again edits the existing one instead of adding a second
        // vote — otherwise one person could drag the average anywhere.
        $this->actingAsSanctum($customer)->postJson('/api/reviews', [
            'product_id' => $product->id, 'rating' => 1, 'comment' => 'Changed my mind',
        ])->assertOk();

        $reviews = Review::where('product_id', $product->id)->get();
        $this->assertCount(1, $reviews);
        $this->assertSame(1, (int) $reviews->first()->rating);
        $this->assertSame('Changed my mind', $reviews->first()->comment);
    }

    public function test_different_customers_each_keep_their_own_review(): void
    {
        $product = $this->product();

        $this->actingAsCustomer()->postJson('/api/reviews', [
            'product_id' => $product->id, 'rating' => 5,
        ])->assertCreated();

        $this->actingAsCustomer()->postJson('/api/reviews', [
            'product_id' => $product->id, 'rating' => 3,
        ])->assertCreated();

        $this->assertSame(2, Review::where('product_id', $product->id)->count());
    }

    public function test_a_review_comment_is_length_capped(): void
    {
        $this->actingAsCustomer()->postJson('/api/reviews', [
            'product_id' => $this->product()->id,
            'rating' => 5,
            'comment' => str_repeat('a', 2500),
        ])->assertStatus(422);
    }

    public function test_the_review_list_is_paginated(): void
    {
        $product = $this->product();
        for ($i = 0; $i < 30; $i++) {
            Review::create([
                'product_id' => $product->id,
                'customer_name' => "Guest {$i}",
                'rating' => 5,
            ]);
        }

        $response = $this->getJson('/api/reviews?limit=10')->assertOk();

        $this->assertCount(10, $response->json('data'));
        $this->assertSame(30, $response->json('total'));
    }
}
