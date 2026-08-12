<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes on the order lines.
 *
 * The table had none at all, not even on the order it belongs to. Every join
 * from an order to its lines therefore scanned the whole table: opening the
 * panel, running a report, and — worst — searching orders by product name,
 * which re-scanned every line for every order considered. On three thousand
 * orders that search took two thirds of a second; it grows with the square.
 *
 * `product_id` and `product_variation_id` carry the reports and the stock
 * screens, which group and total by them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $this->addIndex($table, 'order_items', 'order_id', 'order_items_order_id_index');
            $this->addIndex($table, 'order_items', 'product_id', 'order_items_product_id_index');
            $this->addIndex($table, 'order_items', 'product_variation_id', 'order_items_variation_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            foreach ([
                'order_items_order_id_index',
                'order_items_product_id_index',
                'order_items_variation_id_index',
            ] as $name) {
                try {
                    $table->dropIndex($name);
                } catch (\Throwable $e) {
                    // Never block a rollback over an index that is already gone.
                }
            }
        });
    }

    /**
     * Some installations already have these from an earlier hand-run change, so
     * adding one twice must not fail the deploy.
     */
    private function addIndex(Blueprint $table, string $tableName, string $column, string $name): void
    {
        if (!Schema::hasColumn($tableName, $column)) {
            return;
        }

        try {
            $table->index($column, $name);
        } catch (\Throwable $e) {
            // Already there.
        }
    }
};
