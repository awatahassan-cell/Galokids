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
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'images')) {
                $table->text('images')->nullable()->after('image_url');
            }
            if (!Schema::hasColumn('products', 'gender')) {
                $table->tinyInteger('gender')->default(0)->after('category_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'images')) {
                $table->dropColumn('images');
            }
            if (Schema::hasColumn('products', 'gender')) {
                $table->dropColumn('gender');
            }
        });
    }
};
