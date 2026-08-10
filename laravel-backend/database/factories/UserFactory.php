<?php

namespace Database\Factories;

use App\Support\Roles;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected static ?string $password = null;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => Roles::CUSTOMER,
            'remember_token' => Str::random(10),
        ];
    }

    /** Indicate that the model's email address should be unverified. */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Roles::ADMIN]);
    }

    public function cashier(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Roles::CASHIER]);
    }

    public function staff(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Roles::STAFF]);
    }
}
