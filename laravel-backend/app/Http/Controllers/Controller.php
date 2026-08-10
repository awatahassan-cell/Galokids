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
