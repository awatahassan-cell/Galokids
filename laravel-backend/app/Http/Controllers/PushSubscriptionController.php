<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\PushNotifier;
use Illuminate\Http\Request;

/**
 * A browser signing up for, and off, the shop's notifications.
 *
 * Only back-office accounts subscribe: these carry order details, and a
 * customer has no business receiving them.
 */
class PushSubscriptionController extends Controller
{
    /**
     * The server's public identity, and whether push is switched on at all.
     *
     * The browser needs the public key before it can subscribe. It is public
     * by design — it is what the push service checks the signature against —
     * but it is still only handed to signed-in staff, so the shop's setup is
     * not advertised to visitors.
     */
    public function config(Request $request)
    {
        $this->requirePrivileged($request);

        return response()->json([
            'enabled'    => PushNotifier::isConfigured(),
            'public_key' => config('services.webpush.public_key'),
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->requirePrivileged($request);

        $data = $request->validate([
            'endpoint'          => 'required|string|max:2000|url',
            'keys'              => 'required|array',
            'keys.p256dh'       => 'required|string|max:255',
            'keys.auth'         => 'required|string|max:255',
            'content_encoding'  => 'nullable|string|max:32',
        ]);

        // Keyed on the endpoint, so re-subscribing on the same browser updates
        // the row rather than leaving a duplicate that gets a second copy of
        // every notification.
        $subscription = PushSubscription::updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashFor($data['endpoint'])],
            [
                'user_id'          => $user->id,
                'endpoint'         => $data['endpoint'],
                'public_key'       => $data['keys']['p256dh'],
                'auth_token'       => $data['keys']['auth'],
                'content_encoding' => $data['content_encoding'] ?? 'aesgcm',
                'user_agent'       => substr((string) $request->userAgent(), 0, 255),
                'last_used_at'     => now(),
            ]
        );

        return response()->json(['success' => true, 'id' => $subscription->id], 201);
    }

    public function destroy(Request $request)
    {
        $user = $this->requirePrivileged($request);

        $request->validate(['endpoint' => 'required|string|max:2000']);

        // Scoped to the caller: an endpoint is not a secret worth trusting on
        // its own, so nobody gets to unsubscribe somebody else's browser.
        PushSubscription::where('user_id', $user->id)
            ->where('endpoint_hash', PushSubscription::hashFor($request->input('endpoint')))
            ->delete();

        return response()->json(['success' => true]);
    }

    /** "Send me one now", so the shop can check it works before relying on it. */
    public function test(Request $request, PushNotifier $notifier)
    {
        $user = $this->requirePrivileged($request);

        $request->validate(['endpoint' => 'required|string|max:2000']);

        $subscription = PushSubscription::where('user_id', $user->id)
            ->where('endpoint_hash', PushSubscription::hashFor($request->input('endpoint')))
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'ئەم وێبگەڕە تۆمار نەکراوە.'], 404);
        }

        $sent = $notifier->sendToSubscription($subscription, [
            'title' => '🔔 تاقیکردنەوەی ئاگادارکردنەوە',
            'body'  => 'ئاگادارکردنەوەکان کاردەکەن. کاتێک داواکارییەکی نوێ بێت بەم شێوەیە پیشانت دەدرێت.',
            'tag'   => 'push-test',
            'url'   => '/admin/orders',
        ]);

        return response()->json([
            'success' => $sent,
            'message' => $sent
                ? 'ئاگادارکردنەوەی تاقیکردنەوە نێردرا.'
                : 'ناتوانرێت بنێردرێت — دڵنیابەوە کە کلیلەکانی VAPID ڕێکخراون.',
        ], $sent ? 200 : 503);
    }
}
