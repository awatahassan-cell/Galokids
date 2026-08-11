<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\ActivityLogger;
use App\Support\Shipping;
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

    /**
     * Public: what delivery costs for a governorate, so the basket total shown
     * to the shopper matches what the order will charge.
     */
    public function shippingQuote(Request $request)
    {
        $request->validate([
            'governorate' => 'nullable|string|max:120',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $config = Shipping::config();
        $subtotal = (float) $request->input('subtotal', 0);

        return response()->json([
            'fee' => Shipping::feeFor($request->input('governorate'), $subtotal),
            'free_over' => $config['free_over'],
            'default_fee' => $config['default'],
        ]);
    }

    /** Admin: upsert one or more settings. Body: { key: value, ... } */
    public function update(Request $request)
    {
        $this->requireAdmin($request);

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

        ActivityLogger::log(
            'settings.updated',
            'settings',
            null,
            'Updated: ' . implode(', ', array_slice(array_keys($request->except(['_token', '_method'])), 0, 10))
        );

        return $this->index();
    }
}
