<?php

namespace App\Support;

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
