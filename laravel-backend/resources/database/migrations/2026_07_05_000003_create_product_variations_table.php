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
        Schema::create('product_variations', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $blueprint->string('color')->nullable();
            $blueprint->string('size')->nullable();
            $blueprint->integer('stock_quantity')->default(0);
            $blueprint->string('sku')->nullable();
            $blueprint->decimal('price_override', 10, 2)->nullable();
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variations');
    }
};
