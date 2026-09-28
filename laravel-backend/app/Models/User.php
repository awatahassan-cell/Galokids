<?php

namespace App\Models;

use App\Support\PhoneNumber;
use App\Support\Roles;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'permissions',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'role' => 'integer',
        'permissions' => 'array',
    ];

    /**
     * Phone numbers are always stored canonically (964XXXXXXXXX) so that the
     * unique index actually prevents one customer ending up with several
     * accounts just because they typed 0750… once and +964750… the next time.
     */
    public function setPhoneAttribute($value): void
    {
        $this->attributes['phone'] = $value === null || $value === ''
            ? null
            : (PhoneNumber::normalize($value) ?? $value);
    }

    /** Canonical role id (0 customer, 1 admin, 2 cashier, 3 staff). */
    public function roleId(): int
    {
        return Roles::normalize($this->role);
    }

    public function isAdmin(): bool
    {
        return $this->roleId() === Roles::ADMIN;
    }

    public function isCashier(): bool
    {
        return $this->roleId() === Roles::CASHIER;
    }

    public function isStaff(): bool
    {
        return $this->roleId() === Roles::STAFF;
    }

    /** Admin, cashier or staff — anyone allowed into the back office. */
    public function isPrivileged(): bool
    {
        return Roles::isPrivileged($this->role);
    }

    public function isCustomer(): bool
    {
        return $this->roleId() === Roles::CUSTOMER;
    }

    /**
     * Whether this account may do something in the back office.
     *
     * The role is checked before the permission list, not after. A customer
     * with `["*"]` saved against them used to answer yes to everything —
     * and staff may edit customers, so anyone who could edit a customer could
     * mint one. Back-office permissions belong to back-office roles; for
     * anyone else the answer is no whatever the column says.
     *
     * Admins are unconditional.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if (!$this->isPrivileged()) {
            return false;
        }

        $perms = $this->permissions;
        if (is_array($perms)) {
            return in_array($permission, $perms, true) || in_array('*', $perms, true) || in_array('all', $perms, true);
        }

        return in_array($permission, self::defaultsFor($this->roleId()), true);
    }

    /**
     * What a role may do when nobody has ticked its boxes yet.
     *
     * These two lists must stay identical to ROLE_PERMISSION_PRESETS in
     * `src/utils/permissions.ts`; the panel decides which buttons to draw from
     * that copy and the API decides who may press them from this one. They had
     * drifted — the panel offered a warehouse account the products screen the
     * API would then refuse — so a staff member saw a form that could not save.
     *
     * @return list<string>
     */
    public static function defaultsFor(int $role): array
    {
        if ($role === Roles::CASHIER) {
            return [
                'pos.access',
                'pos.reports',
                'orders.view',
                'orders.manage',
                'products.view',
                'labels.print',
                'customers.view',
            ];
        }

        if ($role === Roles::STAFF) {
            // The panel's `warehouse` and `sales_agent` presets together.
            return [
                'products.view',
                'products.manage',
                'inventory.view',
                'inventory.manage',
                'purchases.manage',
                'labels.print',
                'orders.view',
                'orders.manage',
                'customers.view',
            ];
        }

        return [];
    }

    /**
     * True when an admin has actually chosen this account's permissions.
     *
     * Accounts predating the permissions screen have nothing saved. They keep
     * the access their role has always had, rather than being locked out of
     * the panel by an upgrade; once an admin ticks the boxes, the list is
     * what counts.
     */
    public function hasExplicitPermissions(): bool
    {
        return is_array($this->permissions);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
