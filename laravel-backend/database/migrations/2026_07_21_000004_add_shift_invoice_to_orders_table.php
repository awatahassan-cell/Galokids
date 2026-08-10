<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'shift_id')) {
                $table->foreignId('shift_id')->nullable()->after('user_id')->constrained('shifts')->onDelete('set null');
            }
            if (!Schema::hasColumn('orders', 'invoice_no')) {
                $table->string('invoice_no')->nullable()->after('id');
            }
            if (!Schema::hasColumn('orders', 'refunded_amount')) {
                $table->decimal('refunded_amount', 12, 2)->default(0)->after('total_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['invoice_no', 'refunded_amount']);
            // shift_id has a FK; drop separately if needed on some DBs.
        });
    }
};
