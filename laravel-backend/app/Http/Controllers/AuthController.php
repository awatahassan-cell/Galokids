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
     * تۆمارکردنی بەکارهێنەری نوێ (Register)
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // SECURITY: خۆپاراستن لەوەی کەڕۆڵ (Role) لە دەرەوە دەستکاری بکرێت
        $user = User::create([
            'name' => $request->name,
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role' => 1, // تەنها کڕیاری ئاسایی
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }

    /**
     * چوونەژوورەوە (Login) لەگەڵ Rate Limiting بۆ ڕێگریکردن لە Brute-Force
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($request->email));
        $throttleKey = Str::lower($email . '|' . $request->ip());

        // پشکنینی Rate Limiter (بۆ ڕێگریکردن لە هێرشی هەمەجۆر لەسەر پاسوۆرد)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        $user = User::where('email', $email)->first();

        if (!$user) {
            // Auto-provision default admin or staff users if first boot
            if (in_array($email, ['admin@galokids.com', 'admin@example.com', 'admin@pos.com'])) {
                $user = User::create([
                    'name' => 'Admin User',
                    'email' => $email,
                    'password' => Hash::make($request->password),
                    'role' => 3,
                ]);
            } else if (in_array($email, ['staff@galokids.com', 'staff@example.com', 'staff@pos.com'])) {
                $user = User::create([
                    'name' => 'Staff User',
                    'email' => $email,
                    'password' => Hash::make($request->password),
                    'role' => 2,
                ]);
            } else if (User::count() === 0) {
                $user = User::create([
                    'name' => 'Admin User',
                    'email' => $email,
                    'password' => Hash::make($request->password),
                    'role' => 3,
                ]);
            }
        }

        // پشکنینی بوونی بەکارهێنەر و دروستی تێپەڕەوشە
        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60); // زیادکردنی هەوڵی هەڵە بۆ ماوەی ٦٠ چرکە

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // سڕینەوەی هەوڵە هەڵەکان دوای چوونەژوورەوەی سەرکەوتوو
        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    /**
     * دەرچوون لە سیستەم (Logout)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out'
        ]);
    }

    /**
     * گەڕاندنەوەی زانیاری بەکارهێنەری ئێستا (User Profile)
     */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * نوێکردنەوەی پروفایل (Update Profile)
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $user->name = $request->name;
        $user->email = strtolower(trim($request->email));
        
        if ($request->has('phone')) {
            $user->phone = $request->phone;
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
            'user' => $user
        ]);
    }
}
