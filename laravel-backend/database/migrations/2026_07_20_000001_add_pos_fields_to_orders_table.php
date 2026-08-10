<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('orders', 'customer_phone')) {
                $table->string('customer_phone')->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('orders', 'customer_email')) {
                $table->string('customer_email')->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('orders', 'subtotal')) {
                $table->decimal('subtotal', 10, 2)->default(0)->after('status');
            }
            if (!Schema::hasColumn('orders', 'discount_amount')) {
                $table->decimal('discount_amount', 10, 2)->default(0)->after('subtotal');
            }
            if (!Schema::hasColumn('orders', 'coupon_code')) {
                $table->string('coupon_code')->nullable()->after('discount_amount');
            }
            // POS cash handling
            if (!Schema::hasColumn('orders', 'amount_paid')) {
                $table->decimal('amount_paid', 10, 2)->nullable()->after('total_amount');
            }
            if (!Schema::hasColumn('orders', 'change_due')) {
                $table->decimal('change_due', 10, 2)->nullable()->after('amount_paid');
            }
            // Distinguish an online order from an in-store POS sale
            if (!Schema::hasColumn('orders', 'channel')) {
                $table->string('channel')->default('online')->after('payment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'customer_name', 'customer_phone', 'customer_email',
                'subtotal', 'discount_amount', 'coupon_code',
                'amount_paid', 'change_due', 'channel',
            ]);
        });
    }
};
