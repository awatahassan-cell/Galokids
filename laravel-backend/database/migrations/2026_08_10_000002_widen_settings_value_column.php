<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The live `settings` table was created with `value varchar(255)`, which is far
 * too small for JSON settings such as the translation overrides — MySQL would
 * silently truncate them (or reject the write in strict mode).
 *
 * The create-table migration already declares TEXT, so this only repairs
 * databases that were built before that.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('settings')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE `settings` MODIFY `value` TEXT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE settings ALTER COLUMN value TYPE TEXT');
        }
        // SQLite stores TEXT without a length limit already.
    }

    public function down(): void
    {
        // Deliberately not reverted: shrinking the column back to varchar(255)
        // would truncate any setting that is already longer than that.
    }
};
