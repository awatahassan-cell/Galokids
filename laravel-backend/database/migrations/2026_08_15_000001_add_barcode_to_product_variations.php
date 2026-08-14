<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variations', 'barcode')) {
                $table->string('barcode')->nullable()->after('sku')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            if (Schema::hasColumn('product_variations', 'barcode')) {
                $table->dropIndex(['barcode']);
                $table->dropColumn('barcode');
            }
        });
    }
};
