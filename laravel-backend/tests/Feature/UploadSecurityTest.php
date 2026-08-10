<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class UploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function uploadsDir(): string
    {
        return public_path('uploads/products');
    }

    protected function tearDown(): void
    {
        // Remove anything the test wrote into the real uploads directory.
        foreach (glob($this->uploadsDir() . '/p_*') ?: [] as $file) {
            if (filemtime($file) >= $this->startedAt) {
                @unlink($file);
            }
        }
        parent::tearDown();
    }

    private int $startedAt = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->startedAt = time();
    }

    public function test_a_signed_out_visitor_cannot_upload(): void
    {
        $this->postJson('/api/products/upload-images', [
            'images' => [UploadedFile::fake()->image('photo.jpg')],
        ])->assertUnauthorized();
    }

    public function test_a_customer_cannot_upload(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/products/upload-images', [
            'images' => [UploadedFile::fake()->image('photo.jpg')],
        ])->assertForbidden();
    }

    public function test_an_image_uploaded_under_a_script_filename_is_refused(): void
    {
        $admin = User::factory()->admin()->create();

        // A genuine GIF whose filename ends in .php — the classic polyglot
        // upload. Laravel's mimes rule inspects the client extension too, so
        // this is refused before it reaches the filesystem.
        $tmp = tempnam(sys_get_temp_dir(), 'poly');
        file_put_contents($tmp, base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));

        $this->actingAs($admin)->postJson('/api/products/upload-images', [
            'images' => [new UploadedFile($tmp, 'evil.php', 'image/gif', null, true)],
        ])->assertStatus(422);

        $this->assertSame([], glob($this->uploadsDir() . '/*.php') ?: []);
        @unlink($tmp);
    }

    public function test_the_stored_name_comes_from_the_real_image_type(): void
    {
        $admin = User::factory()->admin()->create();

        // No extension at all on the upload: the stored file must still be
        // named from the verified MIME type, never guessed or left bare.
        $tmp = tempnam(sys_get_temp_dir(), 'noext');
        file_put_contents($tmp, base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));

        $url = (string) $this->actingAs($admin)->postJson('/api/products/upload-images', [
            'images' => [new UploadedFile($tmp, 'photo', 'image/gif', null, true)],
        ])->assertOk()->json('urls.0');

        $this->assertStringEndsWith('.gif', $url);
        @unlink($tmp);
    }

    public function test_a_non_image_upload_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->postJson('/api/products/upload-images', [
            'images' => [UploadedFile::fake()->create('payload.php', 8, 'application/x-php')],
        ])->assertStatus(422);
    }

    public function test_the_media_route_refuses_path_traversal(): void
    {
        $this->get('/api/media/products/' . urlencode('../../../.env'))->assertNotFound();
        $this->get('/api/media/products/..%2F..%2F.env')->assertNotFound();
    }
}
