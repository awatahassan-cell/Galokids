<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Try the Look": a styled outfit worn by a model, and the products it is
     * made of. A look is shown on its own page; each item is a real product, so
     * price, colours, sizes and stock always come from the catalogue.
     */
    public function up(): void
    {
        if (!Schema::hasTable('looks')) {
            Schema::create('looks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('title_ku')->nullable();
                $table->string('title_ar')->nullable();
                $table->text('subtitle')->nullable();
                $table->text('subtitle_ku')->nullable();
                $table->text('subtitle_ar')->nullable();
                // 0 both, 1 boys, 2 girls — the same codes products use.
                $table->unsignedTinyInteger('gender')->default(0);
                $table->string('age_range')->nullable();
                $table->string('accent_color', 16)->default('#141518');
                // The model, full length, on a transparent background.
                $table->text('image_url');
                $table->integer('sort_order')->default(0)->index();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('look_items')) {
            Schema::create('look_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('look_id')->constrained('looks')->cascadeOnDelete();
                // A look follows the product: delete the product and the item goes with it.
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                // top, bottom, shoes, hat or other — what the garment is.
                $table->string('slot', 16)->default('top');
                // Where the numbered dot sits on the model, as a percentage of the picture.
                $table->float('hotspot_x')->default(50);
                $table->float('hotspot_y')->default(50);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('look_items');
        Schema::dropIfExists('looks');
    }
};
