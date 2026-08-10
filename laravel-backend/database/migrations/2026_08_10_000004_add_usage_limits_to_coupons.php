<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Coupons had no limits at all: one leaked code could be redeemed for ever, by
 * everyone, on any basket size.
 *
 * All three columns are nullable/zero by default, so existing coupons keep
 * behaving exactly as before until the shop sets a limit.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('coupons')) {
            return;
        }

        Schema::table('coupons', function (Blueprint $table) {
            if (!Schema::hasColumn('coupons', 'max_uses')) {
                // Total redemptions allowed across all customers. NULL = unlimited.
                $table->unsignedInteger('max_uses')->nullable()->after('discount_percentage');
            }
            if (!Schema::hasColumn('coupons', 'max_uses_per_customer')) {
                // Redemptions allowed per customer. NULL = unlimited.
                $table->unsignedInteger('max_uses_per_customer')->nullable()->after('max_uses');
            }
            if (!Schema::hasColumn('coupons', 'min_order_amount')) {
                // Minimum basket subtotal before the code applies. 0 = no minimum.
                $table->decimal('min_order_amount', 12, 2)->default(0)->after('max_uses_per_customer');
            }
        });

        // Redemptions are counted from the orders table, so that lookup needs
        // an index — and cancelled orders release their use automatically.
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'coupon_code')) {
            try {
                Schema::table('orders', function (Blueprint $table) {
                    $table->index('coupon_code', 'orders_coupon_code_index');
                });
            } catch (\Throwable $e) {
                // Already indexed.
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('coupons')) {
            Schema::table('coupons', function (Blueprint $table) {
                foreach (['max_uses', 'max_uses_per_customer', 'min_order_amount'] as $column) {
                    if (Schema::hasColumn('coupons', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex('orders_coupon_code_index');
            });
        } catch (\Throwable $e) {
            // Not present.
        }
    }
};
