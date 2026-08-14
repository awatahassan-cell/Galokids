<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('phone');
        });

        // Add supplier_id to purchases table
        if (Schema::hasTable('purchases') && !Schema::hasColumn('purchases', 'supplier_id')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->foreignId('supplier_id')->nullable()->after('invoice_number')->constrained('suppliers')->nullOnDelete();
            });
        }

        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->foreignId('purchase_id')->nullable()->constrained('purchases')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('payment_date');
            $table->string('payment_method')->default('cash');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('supplier_id');
            $table->index('payment_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
        if (Schema::hasTable('purchases') && Schema::hasColumn('purchases', 'supplier_id')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropConstrainedForeignId('supplier_id');
            });
        }
        Schema::dropIfExists('suppliers');
    }
};
