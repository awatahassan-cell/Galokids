<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** Public: return all settings as a key => value map (values JSON-decoded). */
    public function index()
    {
        $map = [];
        try {
            $settings = Setting::all();
        } catch (\Exception $e) {
            return response()->json($map);
        }

        foreach ($settings as $s) {
            $val = $s->value;
            if ($val === 'true') {
                $map[$s->key] = true;
            } elseif ($val === 'false') {
                $map[$s->key] = false;
            } elseif ($val === 'null') {
                $map[$s->key] = null;
            } elseif (is_string($val) && isset($val[0]) && ($val[0] === '{' || $val[0] === '[')) {
                $decoded = json_decode($val, true);
                $map[$s->key] = json_last_error() === JSON_ERROR_NONE ? $decoded : $val;
            } else {
                $map[$s->key] = $val;
            }
        }
        return response()->json($map);
    }

    /** Admin: upsert one or more settings. Body: { key: value, ... } */
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $role = $user->role;
        $isAdmin = in_array((int)$role, [3], true) || in_array($role, ['3', 'admin'], true);
        if (!$isAdmin) {
            return response()->json(['message' => 'Unauthorized. Admin role required.'], 403);
        }

        try {
            foreach ($request->all() as $key => $value) {
                if (in_array($key, ['_token', '_method'])) {
                    continue;
                }
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => is_array($value) || is_object($value) ? json_encode($value) : (is_bool($value) ? ($value ? 'true' : 'false') : (string)$value)]
                );
            }
        } catch (\Exception $e) {
            // DB error fallback
        }

        return $this->index();
    }
}
