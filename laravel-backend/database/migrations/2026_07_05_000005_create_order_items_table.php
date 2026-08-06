<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $blueprint->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $blueprint->foreignId('product_variation_id')->nullable()->constrained('product_variations')->onDelete('set null');
            $blueprint->integer('quantity');
            $blueprint->decimal('price', 10, 2);
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
