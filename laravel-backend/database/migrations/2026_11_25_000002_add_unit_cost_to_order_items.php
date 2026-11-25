<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * What a piece cost the shop on the day it was sold.
 *
 * Cost of goods was read from the product's current cost every time a report
 * ran, so restocking at a higher price — or fixing a typo in the cost —
 * rewrote the profit of everything sold before. A sale's profit is fixed on
 * the day, so the cost is recorded with the line.
 *
 * Existing lines can only be given the product's current cost, which is what
 * the reports were already using for them.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('order_items') || Schema::hasColumn('order_items', 'unit_cost')) {
            return;
        }

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->nullable()->after('price');
        });

        DB::statement(
            'UPDATE order_items SET unit_cost = (SELECT products.cost FROM products WHERE products.id = order_items.product_id) '
            . 'WHERE unit_cost IS NULL AND product_id IS NOT NULL'
        );
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'unit_cost')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('unit_cost');
            });
        }
    }
};
