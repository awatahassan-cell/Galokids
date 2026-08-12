<?php

namespace App\Support;

use App\Models\Order;
use App\Models\ProductVariation;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;

/**
 * The one way stock levels are allowed to change.
 *
 * Writing `$variation->stock_quantity = X` directly leaves no trace of who did
 * it or why; go through here instead and the ledger stays complete.
 */
final class StockLedger
{
    /**
     * Put stock back when an order stops being owed, and take it again when it
     * starts being owed once more.
     *
     * A sale takes stock off the shelf. Cancelling means the goods were never
     * handed over, so they belong back — that never happened, so cancelling an
     * order quietly lost the stock. Worse, deleting an order skips restocking a
     * cancelled one on the assumption this already ran, so cancel-then-delete
     * lost it twice.
     *
     * Returns are not handled here: the refund path restocks the specific
     * quantities that came back, which is the only path that knows them.
     */
    public static function reconcileOrderStatus(Order $order, string $from, string $to, ?int $actorId = null): void
    {
        if ($from === $to) {
            return;
        }

        $wasHeld = !in_array($from, Order::STATUSES_WITHOUT_STOCK_HELD, true);
        $isHeld  = !in_array($to, Order::STATUSES_WITHOUT_STOCK_HELD, true);

        // Only a crossing between "the customer has these" and "they do not"
        // moves stock; shipped → delivered does nothing.
        if ($wasHeld === $isHeld) {
            return;
        }

        // An order with returns on it has already had those units put back,
        // line by line. Moving the whole order again would double-count.
        if ($order->returnedQuantity() > 0) {
            return;
        }

        $label = $order->invoice_no ?: ('#' . $order->id);
        $direction = $isHeld ? -1 : 1;
        $reason = $isHeld ? 'Order reopened: ' . $label : 'Order ' . $to . ': ' . $label;

        foreach ($order->items()->get() as $item) {
            if (!$item->product_variation_id) {
                continue;
            }

            $variation = ProductVariation::lockForUpdate()->find($item->product_variation_id);
            if (!$variation) {
                continue;
            }

            self::move(
                $variation,
                $direction * (int) $item->quantity,
                StockMovement::TYPE_ADJUSTMENT,
                $reason,
                $order->id,
                $actorId
            );
        }
    }

    /**
     * Apply a signed change to a variation and record it.
     *
     * @param int $change negative removes stock, positive adds it
     */
    public static function move(
        ProductVariation $variation,
        int $change,
        string $type,
        ?string $note = null,
        ?int $orderId = null,
        ?int $userId = null
    ): StockMovement {
        $before = (int) $variation->stock_quantity;
        $after = max(0, $before + $change);

        $variation->stock_quantity = $after;
        $variation->save();

        return StockMovement::create([
            'product_variation_id' => $variation->id,
            'product_id' => $variation->product_id,
            'type' => $type,
            // Record what actually happened, which can differ from the request
            // when a level would otherwise have gone negative.
            'quantity_change' => $after - $before,
            'quantity_after' => $after,
            'user_id' => $userId ?? Auth::id(),
            'order_id' => $orderId,
            'note' => $note,
        ]);
    }

    /** Set a variation to a counted level (stock-take) and record the difference. */
    public static function setLevel(
        ProductVariation $variation,
        int $countedLevel,
        string $type = StockMovement::TYPE_COUNT,
        ?string $note = null,
        ?int $userId = null
    ): ?StockMovement {
        $before = (int) $variation->stock_quantity;
        $change = max(0, $countedLevel) - $before;

        if ($change === 0) {
            return null;
        }

        return self::move($variation, $change, $type, $note, null, $userId);
    }
}
