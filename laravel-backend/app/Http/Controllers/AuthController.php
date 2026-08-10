<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\PhoneNumber;
use App\Support\Roles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Find the account that owns a phone number, in any format it may have been
     * stored in before numbers were normalized.
     */
    private function findByPhone(?string $phone): ?User
    {
        $variants = PhoneNumber::variants($phone);

        return $variants ? User::whereIn('phone', $variants)->first() : null;
    }

    /**
     * Is this mobile number already registered?
     *
     * The login screen needs this so a customer on a brand-new device can be
     * told "sign up first" instead of the app guessing from browser storage
     * (which is empty for everyone who has never logged in on that device).
     *
     * Only a yes/no plus a masked name is returned — never the email, role or
     * any other detail — and the route is rate limited.
     */
    public function phoneStatus(Request $request)
    {
        $request->validate(['phone' => 'required|string']);

        $user = $this->findByPhone($request->input('phone'));

        return response()->json([
            'exists' => (bool) $user,
            'name'   => $user ? $this->maskName($user->name) : null,
        ]);
    }

    /** "Awat Hassan" → "Awat H." — enough to recognise, not enough to harvest. */
    private function maskName(?string $name): ?string
    {
        $name = trim((string) $name);
        if ($name === '') {
            return null;
        }

        $parts = preg_split('/\s+/', $name);
        if (count($parts) === 1) {
            return $parts[0];
        }

        return $parts[0] . ' ' . mb_substr(end($parts), 0, 1) . '.';
    }

    /**
     * Log in (or create) a customer account from a VERIFIED mobile number.
     *
     * Requires the single-use `verification_token` handed out by
     * POST /verify-otp. Without it this endpoint would issue a session for any
     * phone number sent to it — including a cashier's or the admin's.
     *
     * Exactly one account exists per phone number.
     */
    public function phoneLoginOrRegister(Request $request)
    {
        $request->validate([
            'phone'              => ['required', 'string'],
            'verification_token' => ['required', 'string'],
            'name'               => ['nullable', 'string', 'max:255'],
            'email'              => ['nullable', 'string', 'email', 'max:255'],
        ]);

        $normalizedPhone = PhoneNumber::normalize($request->input('phone'));
        if (!$normalizedPhone) {
            return response()->json(['message' => 'ژمارەی مۆبایلەکە دروست نییە.'], 422);
        }

        // The token proves an OTP for THIS number was just verified, and it can
        // only be redeemed once.
        $verifiedPhone = OtpController::consumeTicket($request->input('verification_token'));

        if (!$verifiedPhone || $verifiedPhone !== $normalizedPhone) {
            return response()->json([
                'message' => 'پشتڕاستکردنەوەی ژمارەی مۆبایل بەسەرچووە. تکایە دووبارە کۆد داوا بکەرەوە.',
            ], 422);
        }

        $user = $this->findByPhone($normalizedPhone);

        if (!$user) {
            // Auto-create a customer account for this number.
            $userName = trim((string) $request->input('name')) ?: 'Customer';
            $email = $request->input('email') ? strtolower(trim($request->input('email'))) : null;

            // Don't fail the signup over an email that belongs to someone else.
            if ($email && User::where('email', $email)->exists()) {
                $email = null;
            }

            $user = User::create([
                'name'     => $userName,
                'phone'    => $normalizedPhone,
                'email'    => $email,
                // Random placeholder; the customer can set a real one in their
                // profile. Phone accounts sign in with OTP, not this password.
                'password' => Hash::make(Str::random(32)),
                'role'     => Roles::CUSTOMER,
            ]);
        } else {
            // Keep the stored number canonical, and fill in a real name if the
            // account was created as a placeholder "Customer".
            $changed = false;

            if ($user->phone !== $normalizedPhone) {
                $user->phone = $normalizedPhone;
                $changed = true;
            }

            $providedName = trim((string) $request->input('name'));
            if ($providedName !== '' && in_array(mb_strtolower((string) $user->name), ['customer', 'کڕیار', 'guest', ''], true)) {
                $user->name = $providedName;
                $changed = true;
            }

            if ($changed) {
                $user->save();
            }
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
     * Register with an email (+ password) and/or a phone number.
     *
     * Self-registration always creates a CUSTOMER. Staff, cashier and admin
     * accounts are created by an admin from the dashboard, or on the server
     * with `php artisan users:set-role`.
     */
    public function register(Request $request)
    {
        $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['nullable', 'string', 'email', 'max:255', 'unique:users'],
            'phone'    => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
        ]);

        $phone = PhoneNumber::normalize($request->input('phone'));
        $email = $request->input('email') ? strtolower(trim($request->input('email'))) : null;

        if (!$email && !$phone) {
            throw ValidationException::withMessages([
                'phone' => ['Please provide either an email or a valid phone number.'],
            ]);
        }

        // Check the canonical form, so "0750…" can't create a second account for
        // a number already registered as "964750…".
        if ($phone && $this->findByPhone($phone)) {
            throw ValidationException::withMessages([
                'phone' => ['ئەم ژمارەی مۆبایلە پێشتر تۆمارکراوە. تکایە بچۆ ژوورەوە.'],
            ]);
        }

        $user = User::create([
            'name'     => $request->input('name'),
            'email'    => $email,
            'phone'    => $phone,
            'password' => Hash::make($request->input('password') ?? Str::random(32)),
            'role'     => Roles::CUSTOMER,
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
     * Log in with email-or-phone + password (staff, cashier, admin and any
     * customer who has set a password).
     */
    public function login(Request $request)
    {
        $request->validate([
            'login'    => ['nullable', 'string'],
            'email'    => ['nullable', 'string'],
            'password' => ['required', 'string'],
        ]);

        $loginInput = trim($request->input('login') ?? $request->input('email') ?? '');
        $throttleKey = Str::lower($loginInput . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        $user = filter_var($loginInput, FILTER_VALIDATE_EMAIL)
            ? User::whereRaw('LOWER(email) = ?', [strtolower($loginInput)])->first()
            : ($this->findByPhone($loginInput)
                ?: User::whereRaw('LOWER(email) = ?', [strtolower($loginInput)])->first());

        // First-run bootstrap only: if the installation has no users at all, the
        // first login creates the owner account.
        //
        // NOTE: the old code also auto-created an ADMIN for a handful of
        // hardcoded email addresses (admin@galokids.com and friends) with
        // whatever password was typed. That was a backdoor — anyone who knew the
        // address could grant themselves the dashboard. It is gone; use
        // `php artisan users:set-role <email|phone> admin` instead.
        if (!$user && User::count() === 0 && filter_var($loginInput, FILTER_VALIDATE_EMAIL)) {
            $user = User::create([
                'name'     => 'Admin User',
                'email'    => strtolower($loginInput),
                'password' => Hash::make($request->input('password')),
                'role'     => Roles::ADMIN,
            ]);
        }

        if (!$user || !Hash::check($request->input('password'), $user->password)) {
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
        $user = $this->requireAuth($request);

        $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['nullable', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone'    => ['nullable', 'string', 'max:255'],
            'address'  => ['nullable', 'string', 'max:1000'],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
        ]);

        $user->name = $request->input('name');

        if ($request->has('email')) {
            $user->email = $request->input('email') ? strtolower(trim($request->input('email'))) : null;
        }

        if ($request->has('phone')) {
            $newPhone = PhoneNumber::normalize($request->input('phone'));

            // The phone number is the login identity for OTP accounts, so it
            // must stay unique — compared in canonical form.
            if ($newPhone) {
                $owner = $this->findByPhone($newPhone);
                if ($owner && $owner->id !== $user->id) {
                    throw ValidationException::withMessages([
                        'phone' => ['ئەم ژمارەی مۆبایلە بۆ ئەکاونتێکی تر تۆمارکراوە.'],
                    ]);
                }
            }

            $user->phone = $newPhone;
        }

        if ($request->has('address')) {
            $user->address = $request->input('address');
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        // A user must keep at least one way to sign in.
        if (!$user->email && !$user->phone) {
            throw ValidationException::withMessages([
                'phone' => ['پێویستە ئیمەیڵ یان ژمارەی مۆبایل هەبێت.'],
            ]);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user
        ]);
    }
}
