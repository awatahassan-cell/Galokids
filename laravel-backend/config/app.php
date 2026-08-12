<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Application Timezone
    |--------------------------------------------------------------------------
    |
    | The shop is in Iraq, so the shop's day is the Baghdad day. This used to be
    | UTC, which put the daily cut-off at 03:00 in the morning local time: a
    | sale rung up after midnight landed on the previous day's report, and
    | "today" on every screen meant a day that had already ended three hours ago.
    |
    | Iraq has not observed daylight saving since 2008, so Asia/Baghdad is a
    | fixed UTC+3 all year. That is what makes the one-off shift of existing
    | timestamps (see the timestamps_to_baghdad_time migration) a simple, safe
    | constant rather than a per-row calculation.
    |
    | Only override this if the shop itself moves to another country.
    |
    */

    'timezone' => env('APP_TIMEZONE', 'Asia/Baghdad'),

];
