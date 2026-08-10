<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The users table was created with `role` defaulting to 1. Under the role
 * scheme the whole app uses today (0 = customer, 1 = admin, 2 = cashier,
 * 3 = staff) that default silently made every row inserted without an explicit
 * role an ADMIN. New accounts must default to customer instead.
 *
 * This only changes the column default — existing rows are left untouched,
 * because repairing legacy values is a decision for the store owner. Use
 * `php artisan users:list-roles` to review them and `php artisan users:set-role`
 * to fix the ones that are wrong.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        // Doctrine DBAL isn't installed, so change the default with raw SQL and
        // keep it driver-aware (SQLite can't ALTER a column default at all).
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE `users` ALTER COLUMN `role` SET DEFAULT 0');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role SET DEFAULT 0');
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE `users` ALTER COLUMN `role` SET DEFAULT 1');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role SET DEFAULT 1');
        }
    }
};
