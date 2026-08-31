<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where a browser says "send my notifications here".
 *
 * One row per browser, not per person: the same member of staff signing in on
 * the shop's computer and on their phone has two, and both should ring. The
 * endpoint is the browser's own push address and is what makes a row unique —
 * re-subscribing on the same browser replaces the row instead of adding one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Push endpoints are long — Chrome's run past 300 characters — and
            // too long for an indexed VARCHAR on MySQL's older row formats, so
            // the uniqueness is enforced on a hash of it instead.
            $table->text('endpoint');
            $table->string('endpoint_hash', 64)->unique();
            $table->string('public_key');
            $table->string('auth_token');
            $table->string('content_encoding', 32)->default('aesgcm');
            $table->string('user_agent')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
