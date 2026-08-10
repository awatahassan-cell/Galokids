<?php

use Illuminate\Support\Facades\Artisan;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| Custom commands live in app/Console/Commands (auto-discovered by Laravel).
| See `users:list-roles` and `users:set-role` for repairing account roles.
|
*/

Artisan::command('inspire', function () {
    $this->comment('Serve the customer, count the cash, close the shift.');
})->purpose('Display an inspiring quote');
