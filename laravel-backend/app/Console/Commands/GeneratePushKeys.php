<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

/**
 * Generate the VAPID key pair that identifies this server to the browsers'
 * push services. Run once, then paste both lines into .env.
 */
class GeneratePushKeys extends Command
{
    protected $signature = 'push:keys';

    protected $description = 'Generate a VAPID key pair for browser push notifications';

    public function handle(): int
    {
        if (filled(config('services.webpush.private_key'))) {
            $this->warn('VAPID keys are already configured in .env.');
            $this->line('Replacing them un-subscribes every browser that is already signed up,');
            $this->line('and each one has to allow notifications again.');

            if (!$this->confirm('Generate a new pair anyway?', false)) {
                return self::SUCCESS;
            }
        }

        $keys = VAPID::createVapidKeys();

        $this->newLine();
        $this->info('Add these two lines to laravel-backend/.env:');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY=' . $keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY=' . $keys['privateKey']);
        $this->newLine();
        $this->comment('Then run: php artisan config:clear');
        $this->comment('The private key is a secret — never commit it.');
        $this->newLine();

        return self::SUCCESS;
    }
}
