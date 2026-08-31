<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Notifications that reach the shop with the panel closed.
 *
 * The panel already alerts anyone who has it open, by asking every twenty-five
 * seconds. That only works while a tab is open and awake, which is not when an
 * order most needs noticing — evenings, or a phone in a pocket. This pushes to
 * the browser instead, through the vendor's own push service, so the alert
 * arrives whether or not the shop is looking.
 *
 * Nothing here throws. A push that cannot be delivered must never take an
 * order down with it: the order is the thing that matters, the notification is
 * a courtesy.
 */
class PushNotifier
{
    /** True when VAPID keys are configured and pushes can actually be sent. */
    public static function isConfigured(): bool
    {
        return filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'));
    }

    /**
     * Tell the shop that an order came in from the website.
     *
     * @param array{id: mixed, customer_name: ?string, total_amount: mixed} $order
     */
    public function newOrder(array $order): void
    {
        $total = number_format((float) ($order['total_amount'] ?? 0), 0, '.', ',');
        $name = $order['customer_name'] ?: 'کڕیاری وێبسایت';
        $reference = '#' . $order['id'];

        $this->sendToStaff([
            'title' => "🛍️ داواکارییەکی نوێ گەیشت! ({$reference})",
            'body'  => "کڕیار: {$name}\nبڕی داواکاری: {$total} د.ع",
            // Opening the same order twice should not stack two notifications.
            'tag'   => 'order-' . $order['id'],
            'url'   => '/admin/orders',
        ], 'orders.view');
    }

    /**
     * Send to every back-office account allowed to see the thing being
     * announced. Someone who cannot open the orders screen has no use for an
     * alert about an order.
     */
    public function sendToStaff(array $payload, string $permission): void
    {
        if (!self::isConfigured()) {
            Log::info('Web push is not configured (VAPID keys missing) — nothing sent.');

            return;
        }

        $recipients = User::query()
            ->whereIn('role', [Roles::ADMIN, Roles::CASHIER, Roles::STAFF])
            ->get()
            ->filter(fn (User $user) => $user->hasPermission($permission))
            ->pluck('id');

        if ($recipients->isEmpty()) {
            return;
        }

        $subscriptions = PushSubscription::whereIn('user_id', $recipients)->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $this->dispatch($subscriptions, $payload);
    }

    /** Send to one specific browser — used by the "send me a test" button. */
    public function sendToSubscription(PushSubscription $subscription, array $payload): bool
    {
        if (!self::isConfigured()) {
            return false;
        }

        return $this->dispatch(collect([$subscription]), $payload) > 0;
    }

    /**
     * @param Collection<int, PushSubscription> $subscriptions
     * @return int how many were accepted by the push service
     */
    private function dispatch(Collection $subscriptions, array $payload): int
    {
        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject'    => (string) config('services.webpush.subject'),
                    'publicKey'  => (string) config('services.webpush.public_key'),
                    'privateKey' => (string) config('services.webpush.private_key'),
                ],
            ]);

            // The push service holds a message for an offline browser. A day is
            // long enough for a phone that was switched off overnight, and short
            // enough that nobody is told about yesterday's order as if it were new.
            $webPush->setDefaultOptions(['TTL' => 86400, 'urgency' => 'high']);

            $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

            foreach ($subscriptions as $subscription) {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint'        => $subscription->endpoint,
                        'publicKey'       => $subscription->public_key,
                        'authToken'       => $subscription->auth_token,
                        'contentEncoding' => $subscription->content_encoding ?: 'aesgcm',
                    ]),
                    $body
                );
            }

            $delivered = 0;

            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $delivered++;
                    continue;
                }

                // 404 and 410 mean the browser threw the subscription away —
                // the user cleared site data, or uninstalled. Keeping it would
                // mean retrying a dead address forever.
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint_hash', PushSubscription::hashFor($report->getEndpoint()))
                        ->delete();
                    continue;
                }

                Log::warning('Web push rejected: ' . $report->getReason());
            }

            return $delivered;
        } catch (\Throwable $e) {
            // Never let a notification failure reach the caller: the order has
            // already been saved and must be reported as saved.
            Log::error('Web push failed: ' . $e->getMessage());

            return 0;
        }
    }
}
