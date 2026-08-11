<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cash taken out of, or put into, the till outside of a sale.
 *
 * Paying a delivery driver or buying tea out of the drawer used to leave no
 * trace, so the Z-report reported a shortage the cashier could not explain.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction', 3);            // in | out
            $table->decimal('amount', 12, 2);
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->index(['shift_id', 'direction']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
