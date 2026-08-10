<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Console\Command;

/**
 * Shows every account with its role, so the store owner can see at a glance
 * who the system currently treats as admin / cashier / staff / customer.
 *
 *   php artisan users:list-roles
 *   php artisan users:list-roles --role=1      (admins only)
 *   php artisan users:list-roles --privileged  (everyone but customers)
 */
class ListUserRoles extends Command
{
    protected $signature = 'users:list-roles
                            {--role= : Only show this role id (0 customer, 1 admin, 2 cashier, 3 staff)}
                            {--privileged : Only show admin, cashier and staff accounts}
                            {--limit=200 : Maximum number of rows to print}';

    protected $description = 'List user accounts with their role (0 customer, 1 admin, 2 cashier, 3 staff)';

    public function handle(): int
    {
        $query = User::query()->orderBy('id');

        if ($this->option('role') !== null && $this->option('role') !== '') {
            $query->where('role', Roles::normalize($this->option('role')));
        }

        if ($this->option('privileged')) {
            $query->whereIn('role', Roles::PRIVILEGED);
        }

        $users = $query->limit((int) $this->option('limit'))->get();

        if ($users->isEmpty()) {
            $this->warn('No matching users found.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Name', 'Email', 'Phone', 'Role', 'Label'],
            $users->map(fn (User $user) => [
                $user->id,
                $user->name,
                $user->email ?: '—',
                $user->phone ?: '—',
                (int) $user->role,
                Roles::label($user->roleId()),
            ])->all()
        );

        $adminCount = User::where('role', Roles::ADMIN)->count();
        $this->newLine();
        $this->line("Admins: {$adminCount}  |  Cashiers: " . User::where('role', Roles::CASHIER)->count()
            . '  |  Staff: ' . User::where('role', Roles::STAFF)->count()
            . '  |  Customers: ' . User::where('role', Roles::CUSTOMER)->count());

        if ($adminCount === 0) {
            $this->error('No admin account exists. Create one with: php artisan users:set-role <email|phone|id> admin');
        }

        return self::SUCCESS;
    }
}
