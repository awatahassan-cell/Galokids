<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * The shop's Instagram posts, fetched here rather than in the browser.
 *
 * The page used to read the access token out of the public settings response
 * and call Instagram itself, which meant the token was published to everyone
 * who opened the site. It stays on the server now; visitors get the posts.
 *
 * The result is cached, so a busy afternoon is one call to Instagram rather
 * than one per visitor — their API is rate limited, and the storefront should
 * not go quiet because too many people came at once.
 */
class InstagramController extends Controller
{
    private const CACHE_KEY = 'instagram.feed';
    private const CACHE_MINUTES = 15;

    public function feed()
    {
        $token = trim((string) optional(Setting::where('key', 'instagram_access_token')->first())->value);

        if ($token === '') {
            return response()->json([]);
        }

        $posts = Cache::remember(self::CACHE_KEY, now()->addMinutes(self::CACHE_MINUTES), function () use ($token) {
            try {
                $response = Http::timeout(8)->get('https://graph.instagram.com/me/media', [
                    'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
                    'limit' => 12,
                    'access_token' => $token,
                ]);

                if (!$response->successful()) {
                    return [];
                }

                return collect($response->json('data') ?? [])
                    ->map(fn ($post) => [
                        'id' => $post['id'] ?? null,
                        'caption' => $post['caption'] ?? null,
                        'mediaType' => $post['media_type'] ?? 'IMAGE',
                        // A video has no image of its own to show; its poster
                        // frame comes back under a different field.
                        'mediaUrl' => ($post['media_type'] ?? '') === 'VIDEO'
                            ? ($post['thumbnail_url'] ?? $post['media_url'] ?? null)
                            : ($post['media_url'] ?? null),
                        'permalink' => $post['permalink'] ?? null,
                        'timestamp' => $post['timestamp'] ?? null,
                        'username' => $post['username'] ?? null,
                    ])
                    ->filter(fn ($post) => $post['id'] && $post['mediaUrl'])
                    ->values()
                    ->all();
            } catch (\Throwable $e) {
                // Instagram being unreachable is not the shop being broken.
                return [];
            }
        });

        return response()->json($posts);
    }
}
