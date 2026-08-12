<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * How much of each order line came back.
 *
 * It was only ever recorded inside the refund's JSON payload, so any report
 * that wanted to leave returned goods out had to read and parse every refund in
 * the range. That is not something SQL can sum, so the reports simply did not
 * do it: returned pieces still counted as sold, and their cost still counted
 * against profit.
 *
 * Keeping the figure on the line makes it a plain column the reports can net
 * out. Existing refunds are read once here so the history stays correct.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('returned_quantity')->default(0)->after('quantity');
        });

        $totals = [];
        foreach (DB::table('refunds')->select('items')->get() as $refund) {
            $lines = json_decode((string) $refund->items, true);
            if (!is_array($lines)) {
                continue;
            }
            foreach ($lines as $line) {
                $itemId = $line['order_item_id'] ?? null;
                if ($itemId !== null) {
                    $totals[$itemId] = ($totals[$itemId] ?? 0) + (int) ($line['quantity'] ?? 0);
                }
            }
        }

        foreach ($totals as $itemId => $quantity) {
            DB::table('order_items')->where('id', $itemId)->update(['returned_quantity' => $quantity]);
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('returned_quantity');
        });
    }
};
