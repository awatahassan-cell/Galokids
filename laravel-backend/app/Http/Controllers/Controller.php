<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Roles;
use Illuminate\Http\Request;

/**
 * Base controller. Also holds the authorization helpers every controller
 * shares, so role checks are written exactly once instead of being re-invented
 * (with different role numbers) in each file.
 */
abstract class Controller
{
    /** The authenticated user, or null. */
    protected function authUser(Request $request): ?User
    {
        return $request->user();
    }

    /** 401 when there is no authenticated user. */
    protected function requireAuth(Request $request): User
    {
        $user = $request->user();
        if (!$user) {
            abort(response()->json(['message' => 'Unauthenticated.'], 401));
        }

        return $user;
    }

    /** Admin, cashier or staff. Everything in the back office needs this. */
    protected function requirePrivileged(Request $request): User
    {
        $user = $this->requireAuth($request);
        if (!$user->isPrivileged()) {
            abort(response()->json(['message' => 'Unauthorized. Staff or Admin role required.'], 403));
        }

        return $user;
    }

    /**
     * Privileged, and allowed to do this particular thing.
     *
     * The permissions screen was enforced only in the panel, which hides
     * buttons — it does not stop a request. A cashier whose account was
     * ticked for the till alone could still create products or read the
     * shop's takings by calling the API directly, which is all the panel does
     * anyway.
     *
     * An account with no permissions saved keeps whatever its role could
     * always do — `hasPermission()` answers from the role's defaults — so
     * turning this on cannot lock existing staff out.
     *
     * The answer used to be skipped entirely for such an account: the check
     * ran only once an admin had ticked the boxes. Until then every account in
     * the back office passed everything, so a cashier hired for the till could
     * delete the shop's products, and ticking a single box was what first took
     * access away rather than granting it. The defaults are the point — ask
     * for them.
     */
    protected function requirePermission(Request $request, string $permission): User
    {
        $user = $this->requirePrivileged($request);

        if (!$user->hasPermission($permission)) {
            abort(response()->json([
                'message'    => 'ئەم کردارە لە دەسەڵاتی هەژمارەکەتدا نییە.',
                'permission' => $permission,
            ], 403));
        }

        return $user;
    }

    /** Admin only (role 1). */
    protected function requireAdmin(Request $request): User
    {
        $user = $this->requireAuth($request);
        if (!$user->isAdmin()) {
            abort(response()->json(['message' => 'Unauthorized. Admin role required.'], 403));
        }

        return $user;
    }

    /** True when the (possibly absent) request user is admin/cashier/staff. */
    protected function isPrivileged(Request $request): bool
    {
        $user = $request->user();

        return $user ? $user->isPrivileged() : false;
    }

    /** True when the (possibly absent) request user is an admin. */
    protected function isAdmin(Request $request): bool
    {
        $user = $request->user();

        return $user ? Roles::isAdmin($user->role) : false;
    }
}
