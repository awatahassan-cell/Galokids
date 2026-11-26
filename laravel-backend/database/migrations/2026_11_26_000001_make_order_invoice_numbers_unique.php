<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * No two receipts share a number.
 *
 * A till prints its own number offline and the server makes its own, so the two
 * could meet. The application now checks, but two syncs arriving together can
 * both pass a check; only the database can say no. If duplicates already exist
 * the index is NOT added — failing a deploy over old data would be worse — and
 * the application-level check still holds.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders') || !Schema::hasColumn('orders', 'invoice_no')) {
            return;
        }

        $duplicates = DB::table('orders')
            ->whereNotNull('invoice_no')
            ->groupBy('invoice_no')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($duplicates) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->unique('invoice_no', 'orders_invoice_no_unique');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropUnique('orders_invoice_no_unique');
            });
        }
    }
};
