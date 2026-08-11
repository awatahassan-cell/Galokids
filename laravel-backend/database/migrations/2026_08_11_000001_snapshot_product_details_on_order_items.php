<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An order line only ever stored a product id, so what the customer bought
 * was really "whatever that product is called today". Delete the product and
 * the line loses its name for good — the order history shows a blank row, and
 * the storefront crashed trying to read a name off nothing.
 *
 * A receipt should not change when the catalogue does. These columns record
 * what was actually sold, at the moment it was sold.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('product_name')->nullable()->after('product_variation_id');
            $table->string('product_name_ku')->nullable()->after('product_name');
            $table->string('product_name_ar')->nullable()->after('product_name_ku');
            // "Pink · 2-3Y" — the variation as it read on the day.
            $table->string('variation_label')->nullable()->after('product_name_ar');
        });

        // Backfill from the catalogue for every line whose product still
        // exists. Lines whose product is already gone stay null and fall back
        // to a placeholder — the name is not recoverable.
        $items = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select('order_items.id', 'products.name', 'products.name_ku', 'products.name_ar')
            ->get();

        foreach ($items as $row) {
            DB::table('order_items')->where('id', $row->id)->update([
                'product_name'    => $row->name,
                'product_name_ku' => $row->name_ku,
                'product_name_ar' => $row->name_ar,
            ]);
        }

        if (Schema::hasTable('product_variations')) {
            $variations = DB::table('order_items')
                ->join('product_variations', 'order_items.product_variation_id', '=', 'product_variations.id')
                ->select('order_items.id', 'product_variations.color', 'product_variations.size')
                ->get();

            foreach ($variations as $row) {
                $label = trim(implode(' · ', array_filter([$row->color, $row->size])));
                if ($label !== '') {
                    DB::table('order_items')->where('id', $row->id)->update(['variation_label' => $label]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['product_name', 'product_name_ku', 'product_name_ar', 'variation_label']);
        });
    }
};
