<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('opening_float', 12, 2)->default(0);
            $table->decimal('counted_cash', 12, 2)->nullable();   // counted at close
            $table->decimal('expected_cash', 12, 2)->nullable();  // computed at close
            $table->decimal('difference', 12, 2)->nullable();     // counted - expected
            $table->string('status')->default('open');            // open | closed
            $table->text('note')->nullable();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
