<?php

use App\Support\TimestampShift;
use Illuminate\Database\Migrations\Migration;

/**
 * Bring every timestamp already in the database onto the Baghdad clock.
 *
 * The application used to run on UTC, so a sale rung up at 21:00 in the shop
 * was stored as 18:00. Now that the app keeps Baghdad time (see config/app.php)
 * those old rows would read three hours early — an evening's takings would land
 * on the wrong side of the daily cut-off and the order history would show times
 * the shop never sold at.
 *
 * Iraq has had no daylight saving since 2008, so every affected row moves by the
 * same three hours. Date-only columns are left alone: a day is a day.
 */
return new class extends Migration
{
    private const HOURS = 3;

    public function up(): void
    {
        TimestampShift::shiftAllBy(self::HOURS);
    }

    public function down(): void
    {
        TimestampShift::shiftAllBy(-self::HOURS);
    }
};
