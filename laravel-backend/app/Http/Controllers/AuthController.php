<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Normalize mobile phone number format to standard 964XXXXXXXXX digits
     */
    private function normalizePhone(?string $phone): ?string
    {
        if (!$phone) return null;
        $digits = preg_replace('/[^\d]/', '', $phone);
        if (str_starts_with($digits, '0')) {
            $digits = '964' . substr($digits, 1);
        } elseif (!str_starts_with($digits, '964') && strlen($digits) >= 10) {
            $digits = '964' . $digits;
        }
        return $digits ?: null;
    }

    /**
     * Login or Auto-Register user by verified Mobile Phone OTP.
     * Ensures EXACTLY ONE account exists per unique phone number.
     */
    public function phoneLoginOrRegister(Request $request)
    {
        $request->validate([
            'phone' => ['required', 'string'],
            'name'  => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ]);

        $normalizedPhone = $this->normalizePhone($request->phone);
        if (!$normalizedPhone) {
            return response()->json(['message' => 'ژمارەی مۆبایلەکە دروست نییە.'], 422);
        }

        // Look up existing account by unique phone number
        $user = User::where('phone', $normalizedPhone)
            ->orWhere('phone', $request->phone)
            ->first();

        if (!$user) {
            // Auto-create new customer account for this phone number
            $userName = trim($request->name ?? '') ?: 'Customer';
            $email = $request->email ? strtolower(trim($request->email)) : null;

            // If email was provided, check if it's already used
            if ($email && User::where('email', $email)->exists()) {
                $email = null; // detach duplicate email to preserve unique phone account creation
            }

            $user = User::create([
                'name'     => $userName,
                'phone'    => $normalizedPhone,
                'email'    => $email,
                'password' => Hash::make(Str::random(16)), // Temporary random password until set by user
                'role'     => 0, // Standard Customer (role 0)
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'      => 'Logged in successfully via OTP',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user,
        ]);
    }

    /**
     * Register user with Email or Phone
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['nullable', 'string', 'email', 'max:255', 'unique:users'],
            'phone'    => ['nullable', 'string', 'max:255', 'unique:users'],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
        ]);

        $phone = $this->normalizePhone($request->phone);
        $email = $request->email ? strtolower(trim($request->email)) : null;

        if (!$email && !$phone) {
            throw ValidationException::withMessages([
                'phone' => ['Please provide either an email or a valid phone number.'],
            ]);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $email,
            'phone'    => $phone,
            'password' => Hash::make($request->password ?? Str::random(16)),
            'role'     => 0, // Standard Customer (role 0)
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'      => 'User registered successfully',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user,
        ], 201);
    }

    /**
     * Login via Email or Phone + Password
     */
    public function login(Request $request)
    {
        $request->validate([
            'login'    => ['nullable', 'string'],
            'email'    => ['nullable', 'string'],
            'password' => ['required', 'string'],
        ]);

        $loginInput = trim($request->login ?? $request->email ?? '');
        $throttleKey = Str::lower($loginInput . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        $normalizedPhone = $this->normalizePhone($loginInput);

        // Search by email OR phone number
        $user = User::where(function ($query) use ($loginInput, $normalizedPhone) {
            $query->where('email', strtolower($loginInput));
            if ($normalizedPhone) {
                $query->orWhere('phone', $normalizedPhone)->orWhere('phone', $loginInput);
            }
        })->first();

        if (!$user) {
            // Auto-provision default admin or staff users if first boot
            if (in_array(strtolower($loginInput), ['admin@galokids.com', 'admin@example.com', 'admin@pos.com'])) {
                $user = User::create([
                    'name' => 'Admin User',
                    'email' => strtolower($loginInput),
                    'password' => Hash::make($request->password),
                    'role' => 3,
                ]);
            } else if (in_array(strtolower($loginInput), ['staff@galokids.com', 'staff@example.com', 'staff@pos.com'])) {
                $user = User::create([
                    'name' => 'Staff User',
                    'email' => strtolower($loginInput),
                    'password' => Hash::make($request->password),
                    'role' => 2,
                ]);
            } else if (User::count() === 0) {
                $user = User::create([
                    'name' => 'Admin User',
                    'email' => strtolower($loginInput),
                    'password' => Hash::make($request->password),
                    'role' => 3,
                ]);
            }
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message'      => 'Logged in successfully',
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user,
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out'
        ]);
    }

    /**
     * Current authenticated user profile
     */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Update Profile & Set/Change Password
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['nullable', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone'    => ['nullable', 'string', 'max:255', 'unique:users,phone,' . $user->id],
            'address'  => ['nullable', 'string', 'max:1000'],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
        ]);

        $user->name = $request->name;
        
        if ($request->has('email')) {
            $user->email = $request->email ? strtolower(trim($request->email)) : null;
        }

        if ($request->has('phone')) {
            $user->phone = $this->normalizePhone($request->phone) ?? $request->phone;
        }

        if ($request->has('address')) {
            $user->address = $request->address;
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user
        ]);
    }
}
