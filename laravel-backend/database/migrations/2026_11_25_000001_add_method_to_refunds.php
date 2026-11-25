<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How a refund was paid back, so the drawer only counts the ones that came out
 * of it.
 *
 * Every refund used to be subtracted from the cashier's expected cash. A
 * website order refunded by bank transfer, or a card sale refunded to the card,
 * never touched the drawer, yet each made it look short by that amount and the
 * cashier was blamed for a shortage that was not there. Existing refunds were
 * all treated as cash, so they default to it and nothing already closed moves.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('refunds') && !Schema::hasColumn('refunds', 'method')) {
            Schema::table('refunds', function (Blueprint $table) {
                $table->string('method', 16)->default('cash')->after('amount');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('refunds', 'method')) {
            Schema::table('refunds', function (Blueprint $table) {
                $table->dropColumn('method');
            });
        }
    }
};
