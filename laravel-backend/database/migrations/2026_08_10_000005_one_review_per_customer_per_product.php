<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A signed-in shopper may hold one review per product.
 *
 * Without this, the same person could post the same 5-star (or 1-star) review
 * over and over and move a product's average rating as far as they wanted.
 * Guest reviews keep a NULL user_id, and SQL allows many NULLs in a unique
 * index, so they are unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reviews')) {
            return;
        }

        // Collapse any duplicates that already exist, keeping the newest.
        $duplicates = DB::table('reviews')
            ->select('product_id', 'user_id', DB::raw('COUNT(*) as total'), DB::raw('MAX(id) as keep_id'))
            ->whereNotNull('user_id')
            ->groupBy('product_id', 'user_id')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicates as $group) {
            DB::table('reviews')
                ->where('product_id', $group->product_id)
                ->where('user_id', $group->user_id)
                ->where('id', '!=', $group->keep_id)
                ->delete();
        }

        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->unique(['product_id', 'user_id'], 'reviews_product_user_unique');
            });
        } catch (\Throwable $e) {
            // Already present.
        }
    }

    public function down(): void
    {
        try {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropUnique('reviews_product_user_unique');
            });
        } catch (\Throwable $e) {
            // Not present.
        }
    }
};
