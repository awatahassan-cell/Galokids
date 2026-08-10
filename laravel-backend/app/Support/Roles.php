<?php

namespace App\Support;

/**
 * Single source of truth for user roles.
 *
 * The whole system (frontend `src/utils/roles.ts` included) uses:
 *   0 = Customer (کڕیار)
 *   1 = Admin    (بەڕێوەبەر)
 *   2 = Cashier  (کاشێر)
 *   3 = Staff    (کارمەند)
 *
 * NOTE: an older version of this project used 1 = registered customer,
 * 2 = staff, 3 = admin. Databases created before the switch still hold those
 * legacy values, which is why every customer suddenly looked like an admin.
 * Use `php artisan users:list-roles` / `php artisan users:set-role` to repair
 * existing rows — this class never guesses, it only normalizes the input it is
 * given against the current scheme.
 */
final class Roles
{
    public const CUSTOMER = 0;
    public const ADMIN    = 1;
    public const CASHIER  = 2;
    public const STAFF    = 3;

    /** Roles that may reach the admin dashboard / POS back office. */
    public const PRIVILEGED = [self::ADMIN, self::CASHIER, self::STAFF];

    /**
     * Turn anything the client may send ("admin", "2", 2, null) into a
     * canonical role id. Unknown values fall back to CUSTOMER, never to a
     * privileged role.
     */
    public static function normalize($role): int
    {
        if (is_int($role) || is_float($role)) {
            $role = (string) (int) $role;
        }

        $value = strtolower(trim((string) $role));

        return match ($value) {
            '1', 'admin', 'owner', 'manager'  => self::ADMIN,
            '2', 'cashier'                    => self::CASHIER,
            '3', 'staff', 'employee'          => self::STAFF,
            default                           => self::CUSTOMER,
        };
    }

    public static function isAdmin($role): bool
    {
        return self::normalize($role) === self::ADMIN;
    }

    public static function isCashier($role): bool
    {
        return self::normalize($role) === self::CASHIER;
    }

    public static function isStaff($role): bool
    {
        return self::normalize($role) === self::STAFF;
    }

    /** Admin, cashier or staff — i.e. anyone who is not a plain customer. */
    public static function isPrivileged($role): bool
    {
        return in_array(self::normalize($role), self::PRIVILEGED, true);
    }

    public static function isCustomer($role): bool
    {
        return self::normalize($role) === self::CUSTOMER;
    }

    public static function label(int $role): string
    {
        return match ($role) {
            self::ADMIN   => 'Admin',
            self::CASHIER => 'Cashier',
            self::STAFF   => 'Staff',
            default       => 'Customer',
        };
    }
}
