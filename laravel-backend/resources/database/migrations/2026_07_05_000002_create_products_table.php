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
        Schema::create('products', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('category_id')->nullable()->constrained('categories')->onDelete('set null');
            $blueprint->string('name');
            $blueprint->string('name_ku')->nullable();
            $blueprint->string('name_ar')->nullable();
            $blueprint->text('description')->nullable();
            $blueprint->text('description_ku')->nullable();
            $blueprint->text('description_ar')->nullable();
            $blueprint->decimal('price', 10, 2);
            $blueprint->decimal('cost', 10, 2)->default(0.00); // Cost attribute
            $blueprint->string('image_url')->nullable();
            $blueprint->string('sku')->nullable();
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
