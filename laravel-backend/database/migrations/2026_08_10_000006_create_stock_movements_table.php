<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every change to a stock level, with who did it and why.
 *
 * The system only ever stored the CURRENT quantity, so when 50 pieces went
 * missing there was no way to tell whether they were sold, returned, miscounted
 * or taken. This is the ledger behind that number.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();

            // sale | refund | adjustment | purchase | count | initial
            $table->string('type', 20)->index();
            // Signed: negative removes stock, positive adds it.
            $table->integer('quantity_change');
            // Level after the change, so the ledger can be read without replaying it.
            $table->integer('quantity_after');

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('order_id')->nullable()->index();
            $table->string('note', 500)->nullable();

            $table->timestamps();

            $table->index(['product_variation_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
