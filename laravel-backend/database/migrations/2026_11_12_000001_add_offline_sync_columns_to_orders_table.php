<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What an order needs before a till can take it offline.
 *
 * `idempotency_key` is the one that matters most. A phone that loses signal
 * mid-request does not know whether the sale landed, so it retries — and
 * without a key the shop gets two orders and the stock comes off twice. The
 * key is made on the device before the first attempt and never changes, so
 * every retry is recognised as the same sale.
 *
 * `offline_stock_conflict` marks a sale that was rung up against a stock count
 * the device held locally and that turned out to be wrong by the time it
 * synced — two tills selling the same last piece. The sale stands; the shop is
 * told so it can count the shelf.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->unique()->after('invoice_no');
            }

            if (!Schema::hasColumn('orders', 'offline_stock_conflict')) {
                $table->boolean('offline_stock_conflict')->default(false)->after('idempotency_key');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'idempotency_key')) {
                $table->dropUnique(['idempotency_key']);
                $table->dropColumn('idempotency_key');
            }

            if (Schema::hasColumn('orders', 'offline_stock_conflict')) {
                $table->dropColumn('offline_stock_conflict');
            }
        });
    }
};
