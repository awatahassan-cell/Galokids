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

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
