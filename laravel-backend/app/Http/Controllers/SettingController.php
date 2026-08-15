<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Support\ActivityLogger;
use App\Support\Shipping;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Settings that are credentials, not preferences.
     *
     * This endpoint is public — the storefront reads the shop's name, logo and
     * delivery rules from it before anyone signs in — so everything in it is
     * readable by anyone who opens the site. An API token stored beside the
     * shop's address was therefore handed to every visitor in plain text, and
     * a `curl` against the settings URL was enough to walk off with it.
     *
     * They are still saved and still editable; they are simply never sent back
     * out. The panel reports whether one is set, which is all it needs to show,
     * and leaving its field blank keeps whatever is already stored.
     */
    private const SECRET_KEYS = [
        'instagram_access_token',
    ];

    /** Public: return the settings map (values JSON-decoded), secrets withheld. */
    public function index()
    {
        $map = [];
        try {
            $settings = Setting::all();
        } catch (\Exception $e) {
            return response()->json($map);
        }

        foreach ($settings as $s) {
            if (in_array($s->key, self::SECRET_KEYS, true)) {
                // Say that one exists without saying what it is, so the panel
                // can show "configured" and the storefront can decide whether
                // to ask the server for the feed.
                $map[$s->key . '_set'] = filled($s->value);
                continue;
            }

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

                // The panel never receives a secret back, so it submits the
                // field empty unless someone typed a new one. Writing that
                // blank through would erase the stored token every time any
                // other setting was saved.
                if (in_array($key, self::SECRET_KEYS, true) && blank($value)) {
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
