<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Somewhere to keep the icon a shop picks for a category.
 *
 * The admin panel has offered an icon picker all along, the model lists `icon`
 * as fillable and the controller validates it — but no migration ever created
 * the column. So picking an icon and pressing save did not quietly lose the
 * choice, it failed the whole request with a 500: the category could not be
 * saved at all until the icon was left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('categories', 'icon')) {
            return;
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->string('icon')->nullable()->after('slug');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('categories', 'icon')) {
            return;
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('icon');
        });
    }
};
