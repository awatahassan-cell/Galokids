<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\PhoneNumber;
use App\Support\ActivityLogger;
use App\Support\Roles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Roles: 0 = customer, 1 = admin, 2 = cashier, 3 = staff.
     *
     * Rules enforced here:
     *  - staff/cashier may see and manage customers (role 0);
     *  - only an admin may create, edit, promote, demote or delete a
     *    privileged account (admin / cashier / staff);
     *  - the last remaining admin can never be demoted or deleted, so the
     *    store can't lock itself out of its own dashboard.
     */
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    private function checkAdmin(Request $request)
    {
        $this->requireAdmin($request);
    }

    /** Only an admin may create or promote a privileged account. */
    private function guardPrivilegedRole(Request $request, $targetRole)
    {
        if ($targetRole !== null && Roles::isPrivileged($targetRole)) {
            $this->checkAdmin($request);
        }
    }

    /** Normalize whatever the panel sent ("cashier", "2", 2) to a role id. */
    private function sanitizeRoleRequest(Request $request)
    {
        if ($request->has('role')) {
            $request->merge(['role' => Roles::normalize($request->input('role'))]);
        }
    }

    private function adminCount(?int $excludingId = null): int
    {
        return User::where('role', Roles::ADMIN)
            ->when($excludingId, fn ($query) => $query->where('id', '!=', $excludingId))
            ->count();
    }

    /**
     * The user list, a page at a time when the caller asks for one.
     *
     * Every customer who ever signs in lands in this table, so it only ever
     * grows. Returning all of it on every visit to the panel is a bill that
     * comes due later rather than never.
     */
    public function index(Request $request)
    {
        $this->checkStaffOrAdmin($request);

        $request->validate([
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1',
            'role' => 'nullable|integer',
            'search' => 'nullable|string|max:255',
        ]);

        $query = User::orderBy('id', 'desc');

        if ($request->filled('role')) {
            $query->where('role', (int) $request->role);
        }

        if ($request->filled('search')) {
            $term = '%' . trim($request->search) . '%';
            $variants = \App\Support\PhoneNumber::variants($request->search);

            $query->where(function ($q) use ($term, $variants) {
                $q->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);

                if (!empty($variants)) {
                    $q->orWhereIn('phone', $variants);
                }
            });
        }

        if ($request->has('page')) {
            $limit = max(1, min((int) $request->input('limit', 25), 200));

            return response()->json($query->paginate($limit));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        $this->sanitizeRoleRequest($request);

        // Phones are stored canonically, so validate uniqueness against that form.
        if ($request->filled('phone')) {
            $request->merge(['phone' => PhoneNumber::normalize($request->input('phone'))]);
        }

        $request->validate([
            'name'     => 'required|string|max:255',
            // An email OR a phone is enough: customers added from the POS
            // normally only have a phone number.
            'email'    => 'nullable|required_without:phone|string|email|max:255|unique:users,email',
            'phone'    => 'nullable|required_without:email|string|max:255|unique:users,phone',
            'role'        => ['required', 'integer', Rule::in([Roles::CUSTOMER, Roles::ADMIN, Roles::CASHIER, Roles::STAFF])],
            // Only accounts that sign in with a password actually need one.
            'password'    => 'nullable|string|min:8',
            'address'     => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        $this->guardPrivilegedRole($request, $request->input('role'));

        $role = Roles::normalize($request->input('role'));

        if (Roles::isPrivileged($role) && !$request->filled('password')) {
            return response()->json([
                'message' => 'A password is required for admin, cashier and staff accounts.',
                'errors'  => ['password' => ['A password is required for admin, cashier and staff accounts.']],
            ], 422);
        }

        $user = User::create([
            'name'        => $request->input('name'),
            'email'       => $request->filled('email') ? strtolower(trim($request->input('email'))) : null,
            'phone'       => $request->input('phone'),
            'password'    => Hash::make($request->filled('password') ? $request->input('password') : Str::random(24)),
            'role'        => $role,
            'address'     => $request->input('address'),
            // A customer has no back-office permissions to hold. Creating one
            // is something staff may do, so anything saved here would be a
            // permission list minted by a non-admin.
            'permissions' => Roles::isPrivileged($role) ? $request->input('permissions') : null,
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $this->sanitizeRoleRequest($request);

        $user = User::findOrFail($id);
        $previousRole = $user->roleId();

        if ($request->filled('phone')) {
            $request->merge(['phone' => PhoneNumber::normalize($request->input('phone'))]);
        }

        $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'email'       => ['nullable', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'       => ['nullable', 'string', 'max:255', Rule::unique('users', 'phone')->ignore($user->id)],
            'role'        => ['sometimes', 'required', 'integer', Rule::in([Roles::CUSTOMER, Roles::ADMIN, Roles::CASHIER, Roles::STAFF])],
            'address'     => 'nullable|string',
            'password'    => 'nullable|string|min:8',
            'permissions' => 'nullable|array',
        ]);

        // Editing an existing admin/cashier/staff account, or promoting someone
        // into one, is admin-only. Prevents staff privilege escalation.
        if ($user->isPrivileged()) {
            $this->checkAdmin($request);
        }
        if ($request->has('role')) {
            $this->guardPrivilegedRole($request, $request->input('role'));
        }

        // Never let the store end up with zero admins.
        if ($request->has('role')
            && $user->isAdmin()
            && !Roles::isAdmin($request->input('role'))
            && $this->adminCount($user->id) === 0) {
            return response()->json([
                'message' => 'This is the only admin account — assign another admin before changing this one.',
            ], 422);
        }

        // SECURITY: explicit whitelist instead of $request->all() to avoid
        // mass-assigning unexpected columns (e.g. a raw plaintext password).
        $user->fill($request->only(['name', 'role', 'address']));

        // Only an admin decides what a back-office account may do, and only a
        // back-office account can be given anything.
        //
        // Staff may edit customers, so without this a cashier could save a
        // permission list onto a customer and then sign in as them. Roles are
        // checked ahead of the list now, but a customer row carrying "*" is
        // still a trap waiting for the next screen that reads it.
        if ($request->has('permissions')) {
            $this->checkAdmin($request);

            $targetRole = $request->has('role') ? Roles::normalize($request->input('role')) : $user->roleId();
            $user->permissions = Roles::isPrivileged($targetRole)
                ? $request->input('permissions')
                : null;
        }

        if ($request->has('email')) {
            $user->email = $request->filled('email') ? strtolower(trim($request->input('email'))) : null;
        }
        if ($request->has('phone')) {
            $user->phone = $request->input('phone') ?: null;
        }
        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        // An account with neither an email nor a phone could never sign in again.
        if (!$user->email && !$user->phone) {
            return response()->json([
                'message' => 'A user needs at least an email address or a phone number.',
            ], 422);
        }

        $user->save();

        if ($request->has('role') && Roles::normalize($request->input('role')) !== $previousRole) {
            ActivityLogger::log(
                'user.role_changed',
                'user',
                $user->id,
                $user->name . ': ' . Roles::label($previousRole) . ' → ' . Roles::label($user->roleId()),
                ['role' => [$previousRole, $user->roleId()]]
            );
        }

        return response()->json($user);
    }

    public function destroy(Request $request, $id)
    {
        $actor = $this->requirePrivileged($request);

        // Prevent deleting oneself
        if ($actor->id == $id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 400);
        }

        $user = User::findOrFail($id);

        // Only an admin may remove another privileged account.
        if ($user->isPrivileged()) {
            $this->checkAdmin($request);
        }

        if ($user->isAdmin() && $this->adminCount($user->id) === 0) {
            return response()->json([
                'message' => 'This is the only admin account and cannot be deleted.',
            ], 422);
        }

        $name = $user->name;
        $user->delete();

        ActivityLogger::log('user.deleted', 'user', $id, $name);

        return response()->json(null, 204);
    }
}
