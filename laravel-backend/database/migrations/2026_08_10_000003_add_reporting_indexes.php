<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the queries that run on every sale and every report.
 *
 * The orders table shipped with only a primary key and the user_id foreign key,
 * so closing a shift, opening the sales report or listing a customer's orders
 * scanned the whole table. That is invisible on a demo database and painful
 * once a busy till has been running for a few months.
 */
return new class extends Migration
{
    /** Add an index only when the table exists and it isn't already there. */
    private function addIndex(string $table, array $columns, string $name): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }
        foreach ($columns as $column) {
            if (!Schema::hasColumn($table, $column)) {
                return;
            }
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
                $blueprint->index($columns, $name);
            });
        } catch (\Throwable $e) {
            // Index already present — nothing to do.
        }
    }

    private function dropIndex(string $table, string $name): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($name) {
                $blueprint->dropIndex($name);
            });
        } catch (\Throwable $e) {
            // Not present — nothing to do.
        }
    }

    public function up(): void
    {
        // Z-report: every order belonging to a shift.
        $this->addIndex('orders', ['shift_id'], 'orders_shift_id_index');
        // Sales reports and the daily revenue chart filter on a date range.
        $this->addIndex('orders', ['created_at'], 'orders_created_at_index');
        // "My orders" and the POS customer lookup match on the phone number.
        $this->addIndex('orders', ['customer_phone'], 'orders_customer_phone_index');
        // Dashboard counters group by status, and reports split online vs pos.
        $this->addIndex('orders', ['status'], 'orders_status_index');
        $this->addIndex('orders', ['channel'], 'orders_channel_index');

        // Refunds are looked up per shift (Z-report) and per order (refund caps).
        $this->addIndex('refunds', ['shift_id'], 'refunds_shift_id_index');
        $this->addIndex('refunds', ['order_id'], 'refunds_order_id_index');

        // The cashier's open shift is fetched on every POS sale.
        $this->addIndex('shifts', ['user_id', 'status'], 'shifts_user_id_status_index');

        // Barcode scanning in the POS.
        $this->addIndex('products', ['sku'], 'products_sku_index');
    }

    public function down(): void
    {
        $this->dropIndex('orders', 'orders_shift_id_index');
        $this->dropIndex('orders', 'orders_created_at_index');
        $this->dropIndex('orders', 'orders_customer_phone_index');
        $this->dropIndex('orders', 'orders_status_index');
        $this->dropIndex('orders', 'orders_channel_index');
        $this->dropIndex('refunds', 'refunds_shift_id_index');
        $this->dropIndex('refunds', 'refunds_order_id_index');
        $this->dropIndex('shifts', 'shifts_user_id_status_index');
        $this->dropIndex('products', 'products_sku_index');
    }
};
