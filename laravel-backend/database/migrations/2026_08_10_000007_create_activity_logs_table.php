<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who changed what, and when.
 *
 * Nothing recorded price edits, deleted orders, refunds or role changes, so
 * after something went wrong there was no way to find out what happened.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();   // kept even if the account is deleted
            $table->string('action', 60)->index();     // product.updated, order.deleted, …
            $table->string('subject_type', 40)->nullable();
            $table->string('subject_id', 40)->nullable();
            $table->string('summary', 500)->nullable();
            $table->text('changes')->nullable();       // JSON { field: [before, after] }
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
