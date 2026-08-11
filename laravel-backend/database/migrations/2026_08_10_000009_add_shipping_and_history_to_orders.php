<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Delivery charge on the order, plus a record of every status change.
 *
 * Online profit was overstated because the delivery charge the shop pays was
 * never part of the order, and an order only ever showed its current status.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'shipping_fee')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->decimal('shipping_fee', 12, 2)->default(0)->after('discount_amount');
                $table->string('governorate')->nullable()->after('shipping_address');
            });
        }

        Schema::create('order_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('note', 500)->nullable();
            $table->boolean('customer_notified')->default(false);
            $table->timestamps();

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_history');

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'shipping_fee')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn(['shipping_fee', 'governorate']);
            });
        }
    }
};
