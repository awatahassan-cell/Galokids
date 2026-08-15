<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Purchase;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\User;
use App\Support\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Buying stock, and what the shop owes for it.
 *
 * Every case here stood for something the purchases screen got wrong: stock
 * counted twice, a debt that would not come down when it was paid, goods that
 * stayed on the shelf after the invoice that brought them was deleted.
 */
class PurchasesAndSuppliersTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => Roles::ADMIN]);
    }

    private function variation(int $stock = 5): ProductVariation
    {
        $product = Product::create(['name' => 'Tee', 'price' => 10000, 'cost' => 6000]);

        return ProductVariation::create([
            'product_id' => $product->id,
            'color' => 'Red',
            'size' => '2-3',
            'stock_quantity' => $stock,
        ]);
    }

    private function buy(User $actor, ProductVariation $v, array $overrides = [])
    {
        return $this->actingAs($actor)->postJson('/api/purchases', array_merge([
            'supplier_name' => 'Ali',
            'purchase_date' => '2026-08-15',
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 10,
                'cost_price' => 7000,
            ]],
        ], $overrides));
    }

    // ---- stock ----------------------------------------------------------

    public function test_a_purchase_adds_exactly_the_quantity_bought(): void
    {
        $v = $this->variation(5);

        $this->buy($this->admin(), $v)->assertCreated();

        $this->assertSame(15, (int) $v->fresh()->stock_quantity);
    }

    public function test_the_ledger_records_the_purchase_once(): void
    {
        $v = $this->variation(5);

        $this->buy($this->admin(), $v)->assertCreated();

        $moves = StockMovement::where('product_variation_id', $v->id)->get();
        $this->assertCount(1, $moves);
        $this->assertSame(10, (int) $moves->first()->quantity_change);
        $this->assertSame(15, (int) $moves->first()->quantity_after);
        $this->assertSame(StockMovement::TYPE_PURCHASE, $moves->first()->type);
    }

    public function test_deleting_a_purchase_takes_the_stock_back_off(): void
    {
        $v = $this->variation(5);
        $admin = $this->admin();

        $id = $this->buy($admin, $v)->assertCreated()->json('id');

        $this->actingAs($admin)->deleteJson("/api/purchases/{$id}")->assertOk();

        $this->assertSame(5, (int) $v->fresh()->stock_quantity);
        $this->assertSame(0, Purchase::count());
    }

    public function test_deleting_a_purchase_after_the_goods_sold_does_not_go_negative(): void
    {
        $v = $this->variation(0);
        $admin = $this->admin();

        $id = $this->buy($admin, $v)->assertCreated()->json('id');
        // All ten walked out of the shop before anyone noticed the typo.
        $v->fresh()->update(['stock_quantity' => 0]);

        $this->actingAs($admin)->deleteJson("/api/purchases/{$id}")->assertOk();

        $this->assertSame(0, (int) $v->fresh()->stock_quantity);
    }

    public function test_a_purchase_updates_the_product_cost_and_price(): void
    {
        $v = $this->variation();

        $this->buy($this->admin(), $v, [
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 3,
                'cost_price' => 8000,
                'retail_price' => 14000,
            ]],
        ])->assertCreated();

        $product = $v->product()->first();
        $this->assertSame(8000.0, (float) $product->cost);
        $this->assertSame(14000.0, (float) $product->price);
    }

    // ---- what is owed ---------------------------------------------------

    private function debtOf(User $actor, int $supplierId): float
    {
        $row = collect($this->actingAs($actor)->getJson('/api/suppliers')->json())
            ->firstWhere('id', $supplierId);

        return (float) $row['debt_balance'];
    }

    public function test_paying_a_supplier_on_account_reduces_the_debt(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $this->buy($admin, $v, [
            'paid_amount' => 0,
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 10,
                'cost_price' => 1000,
            ]],
        ])->assertCreated();

        $supplier = Supplier::where('name', 'Ali')->firstOrFail();
        $this->assertSame(10000.0, $this->debtOf($admin, $supplier->id));

        // The accounts screen pays a supplier, not an invoice: no purchase_id.
        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", [
            'amount' => 4000,
            'payment_date' => '2026-08-15',
        ])->assertCreated();

        $this->assertSame(6000.0, $this->debtOf($admin, $supplier->id));
    }

    public function test_a_payment_against_one_invoice_is_only_counted_once(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $purchaseId = $this->buy($admin, $v, [
            'paid_amount' => 0,
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 10,
                'cost_price' => 1000,
            ]],
        ])->assertCreated()->json('id');

        $supplier = Supplier::where('name', 'Ali')->firstOrFail();

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", [
            'amount' => 4000,
            'payment_date' => '2026-08-15',
            'purchase_id' => $purchaseId,
        ])->assertCreated();

        $this->assertSame(6000.0, $this->debtOf($admin, $supplier->id));
        $this->assertSame('partial', Purchase::find($purchaseId)->payment_status);
    }

    public function test_the_opening_balance_counts_towards_the_debt(): void
    {
        $admin = $this->admin();
        $supplier = Supplier::create(['name' => 'Ali', 'opening_balance' => 2500]);

        $this->assertSame(2500.0, $this->debtOf($admin, $supplier->id));
    }

    public function test_paying_more_than_is_owed_shows_as_credit(): void
    {
        $admin = $this->admin();
        $supplier = Supplier::create(['name' => 'Ali', 'opening_balance' => 1000]);

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", [
            'amount' => 1500,
            'payment_date' => '2026-08-15',
        ])->assertCreated();

        // Clamped at zero this read as "settled", hiding the 500 overpaid.
        $this->assertSame(-500.0, $this->debtOf($admin, $supplier->id));
    }

    public function test_an_invoice_cannot_be_recorded_as_overpaid(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $id = $this->buy($admin, $v, [
            'paid_amount' => 999999,
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 2,
                'cost_price' => 1000,
            ]],
        ])->assertCreated()->json('id');

        $purchase = Purchase::find($id);
        $this->assertSame(2000.0, (float) $purchase->paid_amount);
        $this->assertSame('paid', $purchase->payment_status);
    }

    public function test_an_unpaid_invoice_cannot_claim_to_be_paid(): void
    {
        $v = $this->variation();

        $id = $this->buy($this->admin(), $v, [
            'paid_amount' => 0,
            'payment_status' => 'paid',
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 2,
                'cost_price' => 1000,
            ]],
        ])->assertCreated()->json('id');

        $this->assertSame('unpaid', Purchase::find($id)->payment_status);
    }

    public function test_a_payment_naming_someone_elses_invoice_stays_on_account(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $otherInvoice = $this->buy($admin, $v, ['supplier_name' => 'Omar', 'paid_amount' => 0])
            ->assertCreated()->json('id');

        $ali = Supplier::create(['name' => 'Ali', 'opening_balance' => 5000]);

        $this->actingAs($admin)->postJson("/api/suppliers/{$ali->id}/payments", [
            'amount' => 1000,
            'payment_date' => '2026-08-15',
            'purchase_id' => $otherInvoice,
        ])->assertCreated();

        // Ali's own balance moves; Omar's invoice is left alone.
        $this->assertSame(4000.0, $this->debtOf($admin, $ali->id));
        $this->assertSame(0.0, (float) Purchase::find($otherInvoice)->paid_amount);
        $this->assertNull(SupplierPayment::first()->purchase_id);
    }

    public function test_the_statement_and_the_list_agree_on_the_debt(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $this->buy($admin, $v, [
            'paid_amount' => 0,
            'items' => [[
                'product_id' => $v->product_id,
                'product_variation_id' => $v->id,
                'quantity' => 10,
                'cost_price' => 1000,
            ]],
        ])->assertCreated();

        $supplier = Supplier::where('name', 'Ali')->firstOrFail();

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/payments", [
            'amount' => 2500,
            'payment_date' => '2026-08-15',
        ])->assertCreated();

        $statement = $this->actingAs($admin)->getJson("/api/suppliers/{$supplier->id}")->assertOk()->json();

        $this->assertSame($this->debtOf($admin, $supplier->id), (float) $statement['debt_balance']);
        $this->assertSame(7500.0, (float) $statement['debt_balance']);
    }

    public function test_a_supplier_with_history_cannot_be_deleted(): void
    {
        $v = $this->variation();
        $admin = $this->admin();

        $this->buy($admin, $v)->assertCreated();
        $supplier = Supplier::where('name', 'Ali')->firstOrFail();

        $this->actingAs($admin)->deleteJson("/api/suppliers/{$supplier->id}")->assertStatus(409);

        $this->assertNotNull(Supplier::find($supplier->id));
    }

    public function test_an_unused_supplier_can_be_deleted(): void
    {
        $supplier = Supplier::create(['name' => 'Nobody']);

        $this->actingAs($this->admin())->deleteJson("/api/suppliers/{$supplier->id}")->assertOk();

        $this->assertNull(Supplier::find($supplier->id));
    }

    // ---- who may do this ------------------------------------------------

    public function test_a_customer_cannot_buy_stock(): void
    {
        $v = $this->variation();

        $this->buy(User::factory()->create(['role' => Roles::CUSTOMER]), $v)->assertForbidden();

        $this->assertSame(5, (int) $v->fresh()->stock_quantity);
    }

    public function test_a_customer_cannot_read_the_suppliers_ledger(): void
    {
        $this->actingAs(User::factory()->create(['role' => Roles::CUSTOMER]))
            ->getJson('/api/suppliers')
            ->assertForbidden();
    }

    public function test_there_is_no_route_for_editing_a_saved_purchase(): void
    {
        $v = $this->variation();
        $admin = $this->admin();
        $id = $this->buy($admin, $v)->assertCreated()->json('id');

        // Method not allowed, rather than reaching a method that is not there.
        $this->actingAs($admin)->putJson("/api/purchases/{$id}", ['supplier_name' => 'X'])
            ->assertStatus(405);
    }

    // ---- the shop's own secrets ----------------------------------------

    public function test_the_instagram_token_is_not_handed_to_visitors(): void
    {
        Setting::updateOrCreate(['key' => 'instagram_access_token'], ['value' => 'IGQV-SECRET']);
        Setting::updateOrCreate(['key' => 'store_name'], ['value' => 'Galo Kids']);

        $settings = $this->getJson('/api/settings')->assertOk()->json();

        $this->assertArrayNotHasKey('instagram_access_token', $settings);
        $this->assertTrue($settings['instagram_access_token_set']);
        $this->assertSame('Galo Kids', $settings['store_name']);
        $this->assertStringNotContainsString('IGQV-SECRET', json_encode($settings));
    }

    public function test_saving_other_settings_does_not_wipe_the_stored_token(): void
    {
        Setting::updateOrCreate(['key' => 'instagram_access_token'], ['value' => 'IGQV-SECRET']);

        $this->actingAs($this->admin())->putJson('/api/settings', [
            'store_name' => 'Galo Kids',
            'instagram_access_token' => '',
        ])->assertOk();

        $this->assertSame('IGQV-SECRET', Setting::where('key', 'instagram_access_token')->first()->value);
    }

    public function test_a_new_token_still_replaces_the_old_one(): void
    {
        Setting::updateOrCreate(['key' => 'instagram_access_token'], ['value' => 'OLD']);

        $this->actingAs($this->admin())->putJson('/api/settings', [
            'instagram_access_token' => 'NEW',
        ])->assertOk();

        $this->assertSame('NEW', Setting::where('key', 'instagram_access_token')->first()->value);
    }

    public function test_the_instagram_feed_is_empty_when_no_token_is_configured(): void
    {
        $this->getJson('/api/instagram/feed')->assertOk()->assertExactJson([]);
    }
}
