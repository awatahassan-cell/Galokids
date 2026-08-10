<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\PhoneNumber;
use App\Support\Roles;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Repairs / assigns an account's role from the server, without needing an
 * already-working admin login. This is the escape hatch when a database still
 * holds legacy role values (the old scheme used 1 = customer and 3 = admin).
 *
 *   php artisan users:set-role admin@galokids.com admin
 *   php artisan users:set-role 07501234567 cashier
 *   php artisan users:set-role 42 customer
 *   php artisan users:set-role 07501234567 admin --password=secret123
 */
class SetUserRole extends Command
{
    protected $signature = 'users:set-role
                            {user : Account id, email address or phone number}
                            {role : customer|admin|cashier|staff (or 0|1|2|3)}
                            {--password= : Also set a new login password for this account}';

    protected $description = 'Set a user account role (0 customer, 1 admin, 2 cashier, 3 staff)';

    public function handle(): int
    {
        $identifier = trim((string) $this->argument('user'));
        $role = Roles::normalize($this->argument('role'));

        // Reject a typo'd role instead of silently downgrading to customer.
        $known = ['0', '1', '2', '3', 'customer', 'admin', 'cashier', 'staff', 'owner', 'manager', 'employee'];
        if (!in_array(strtolower(trim((string) $this->argument('role'))), $known, true)) {
            $this->error('Unknown role "' . $this->argument('role') . '". Use customer, admin, cashier or staff.');

            return self::FAILURE;
        }

        $user = $this->findUser($identifier);

        if (!$user) {
            $this->error("No account found for \"{$identifier}\".");
            $this->line('Tip: run `php artisan users:list-roles` to see the existing accounts.');

            return self::FAILURE;
        }

        // Refuse to remove the last admin — that would lock everyone out.
        if ($user->isAdmin() && $role !== Roles::ADMIN) {
            $otherAdmins = User::where('role', Roles::ADMIN)->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                $this->error('This is the only admin account. Promote another account to admin first.');

                return self::FAILURE;
            }
        }

        $previous = Roles::label($user->roleId());
        $user->role = $role;

        if ($this->option('password')) {
            $user->password = Hash::make($this->option('password'));
        }

        $user->save();

        $this->info(sprintf(
            'Updated #%d (%s): %s → %s (role %d)%s',
            $user->id,
            $user->email ?: $user->phone,
            $previous,
            Roles::label($role),
            $role,
            $this->option('password') ? ' — password updated' : ''
        ));

        return self::SUCCESS;
    }

    private function findUser(string $identifier): ?User
    {
        if (ctype_digit($identifier) && strlen($identifier) <= 6) {
            $byId = User::find((int) $identifier);
            if ($byId) {
                return $byId;
            }
        }

        if (str_contains($identifier, '@')) {
            return User::whereRaw('LOWER(email) = ?', [strtolower($identifier)])->first();
        }

        $variants = PhoneNumber::variants($identifier);

        return $variants ? User::whereIn('phone', $variants)->first() : null;
    }
}
