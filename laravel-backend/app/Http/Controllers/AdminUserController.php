<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || !in_array((int)$user->role, [2, 3])) {
            abort(response()->json(['message' => 'Unauthorized. Staff or Admin role required.'], 403));
        }
    }

    private function checkAdmin(Request $request)
    {
        $user = $request->user();
        if (!$user || (int)$user->role !== 3) {
            abort(response()->json(['message' => 'Unauthorized. Admin role required.'], 403));
        }
    }

    /**
     * SECURITY: only an admin (role 3) may create or promote privileged accounts
     * (staff = 2, admin = 3). This stops a staff member from escalating themselves
     * or others to admin.
     */
    private function guardPrivilegedRole(Request $request, $targetRole)
    {
        if ($targetRole !== null && in_array((int)$targetRole, [2, 3])) {
            $this->checkAdmin($request);
        }
    }

    private function sanitizeRoleRequest(Request $request)
    {
        if ($request->has('role')) {
            $r = $request->role;
            if ($r === 'admin' || $r === '3' || $r === 3) {
                $r = 3;
            } elseif ($r === 'staff' || $r === '2' || $r === 2) {
                $r = 2;
            } else {
                $r = 1;
            }
            $request->merge(['role' => $r]);
        }
    }

    public function index(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        return response()->json(User::all());
    }

    public function store(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        $this->sanitizeRoleRequest($request);
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|integer|in:1,2,3',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
        ]);

        $this->guardPrivilegedRole($request, $request->role);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => (int)$request->role,
            'phone' => $request->phone,
            'address' => $request->address,
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $this->sanitizeRoleRequest($request);
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'role' => 'sometimes|required|integer|in:1,2,3',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'password' => 'nullable|string|min:8',
        ]);

        // Only an admin may grant a privileged role, or change a user who is
        // already staff/admin. Prevents staff from escalating privileges.
        if ($request->has('role')) {
            $this->guardPrivilegedRole($request, $request->role);
        }
        if (in_array((int)$user->role, [2, 3])) {
            $this->checkAdmin($request);
        }

        // SECURITY: explicit whitelist instead of $request->all() to avoid
        // mass-assigning unexpected columns (e.g. a raw plaintext password).
        $user->fill($request->only(['name', 'email', 'role', 'phone', 'address']));

        if ($request->filled('password')) {
            $user->password = bcrypt($request->password);
        }

        $user->save();

        return response()->json($user);
    }

    public function destroy(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        
        // Prevent deleting oneself
        if ($request->user()->id == $id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 400);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(null, 204);
    }
}
