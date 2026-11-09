<?php

namespace Tests\Feature\Admin;

use App\Models\Medicine;
use App\Models\StockBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/stok')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_stock_management(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/stok')->assertForbidden();
    }

    public function test_admin_can_view_stock_list_with_live_metrics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $safe = Medicine::create($this->medicinePayload([
            'code' => 'OBT-001',
            'name' => 'Paracetamol 500mg',
            'stock' => 100,
            'minimum_stock' => 10,
        ]));

        $critical = Medicine::create($this->medicinePayload([
            'code' => 'OBT-002',
            'name' => 'Amoxicillin 500mg',
            'stock' => 5,
            'minimum_stock' => 10,
        ]));

        StockBatch::create($this->batchPayload($safe, [
            'batch_number' => 'BTH-PAR-001',
            'quantity' => 100,
            'initial_quantity' => 100,
            'unit_price' => 1000,
            'expired_at' => now()->addDays(200)->toDateString(),
        ]));

        StockBatch::create($this->batchPayload($critical, [
            'batch_number' => 'BTH-AMX-001',
            'quantity' => 5,
            'initial_quantity' => 5,
            'unit_price' => 2000,
            'expired_at' => now()->addDays(30)->toDateString(),
        ]));

        $this->actingAs($admin)
            ->get('/admin/stok')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/stok')
                ->has('batches.data', 2)
                ->where('stats.total_value', 110000)
                ->where('stats.safe_skus', 1)
                ->where('stats.critical_skus', 1)
                ->where('stats.out_of_stock', 0)
                ->where('stats.expiring_batches', 1)
                ->where('stats.total_batches', 2)
                ->where('stats.recent_batches', 2)
                ->has('medicines', 2)
                ->has('locations'));
    }

    public function test_admin_can_add_stock_batch_and_record_movement(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload(['stock' => 10, 'minimum_stock' => 5]));

        $this->actingAs($admin)
            ->from(route('admin.stok.index'))
            ->post(route('admin.stok.store'), $this->stockPayload($medicine, [
                'batch_number' => 'BTH-TEST-001',
                'quantity' => 15,
                'unit_price' => 2500,
                'expired_at' => now()->addYear()->toDateString(),
            ]))
            ->assertRedirect(route('admin.stok.index'))
            ->assertSessionHas('success');

        $this->assertSame(25, $medicine->fresh()->stock);

        $this->assertDatabaseHas('stock_batches', [
            'medicine_id' => $medicine->id,
            'batch_number' => 'BTH-TEST-001',
            'quantity' => 15,
            'unit_price' => 2500,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'medicine_id' => $medicine->id,
            'type' => 'masuk',
            'quantity' => 15,
            'user_id' => $admin->id,
        ]);
    }

    public function test_batch_number_must_be_unique_per_medicine(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload());

        StockBatch::create($this->batchPayload($medicine, ['batch_number' => 'BTH-DUP-001']));

        $this->actingAs($admin)
            ->from(route('admin.stok.index'))
            ->post(route('admin.stok.store'), $this->stockPayload($medicine, [
                'batch_number' => 'BTH-DUP-001',
            ]))
            ->assertSessionHasErrors('batch_number');

        $this->assertDatabaseCount('stock_batches', 1);
    }

    public function test_quantity_must_be_at_least_one(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload());

        $this->actingAs($admin)
            ->post(route('admin.stok.store'), $this->stockPayload($medicine, ['quantity' => 0]))
            ->assertSessionHasErrors('quantity');

        $this->assertDatabaseCount('stock_batches', 0);
    }

    public function test_stock_list_can_be_filtered_by_critical_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $safe = Medicine::create($this->medicinePayload([
            'code' => 'OBT-001',
            'name' => 'Stok Aman',
            'stock' => 100,
            'minimum_stock' => 10,
        ]));

        $critical = Medicine::create($this->medicinePayload([
            'code' => 'OBT-002',
            'name' => 'Stok Kritis',
            'stock' => 5,
            'minimum_stock' => 10,
        ]));

        StockBatch::create($this->batchPayload($safe, ['batch_number' => 'BTH-SAFE-001']));
        StockBatch::create($this->batchPayload($critical, [
            'batch_number' => 'BTH-CRIT-001',
            'quantity' => 5,
            'initial_quantity' => 5,
        ]));

        $this->actingAs($admin)
            ->get('/admin/stok?status=kritis')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('batches.data', 1)
                ->where('batches.data.0.medicine.name', 'Stok Kritis'));
    }

    public function test_stock_list_can_be_filtered_by_expiring_batches(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload());

        StockBatch::create($this->batchPayload($medicine, [
            'batch_number' => 'BTH-EXP-001',
            'expired_at' => now()->addDays(45)->toDateString(),
        ]));

        StockBatch::create($this->batchPayload($medicine, [
            'batch_number' => 'BTH-FAR-001',
            'expired_at' => now()->addDays(365)->toDateString(),
        ]));

        $this->actingAs($admin)
            ->get('/admin/stok?tab=kadaluwarsa')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('batches.data', 1)
                ->where('batches.data.0.batch_number', 'BTH-EXP-001'));
    }

    public function test_admin_can_export_stock_report(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload(['name' => 'Paracetamol 500mg']));

        StockBatch::create($this->batchPayload($medicine, ['batch_number' => 'BTH-EXP-002']));

        $response = $this->actingAs($admin)->get(route('admin.stok.export'));

        $response->assertOk();
        $response->assertDownload('laporan-stok-obat.csv');
        $this->assertStringContainsString('Paracetamol 500mg', $response->streamedContent());
        $this->assertStringContainsString('BTH-EXP-002', $response->streamedContent());
    }

    public function test_creating_medicine_with_stock_creates_initial_batch(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.obat.store'), $this->medicineFormPayload([
                'code' => 'OBT-010',
                'stock' => 40,
            ]))
            ->assertSessionHas('success');

        $medicine = Medicine::query()->where('code', 'OBT-010')->firstOrFail();

        $this->assertDatabaseHas('stock_batches', [
            'medicine_id' => $medicine->id,
            'quantity' => 40,
            'initial_quantity' => 40,
        ]);
    }

    public function test_updating_medicine_stock_keeps_batches_in_sync(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->medicinePayload(['stock' => 10, 'minimum_stock' => 5]));

        StockBatch::create($this->batchPayload($medicine, [
            'quantity' => 10,
            'initial_quantity' => 10,
        ]));

        $this->actingAs($admin)
            ->put(route('admin.obat.update', $medicine), $this->medicineFormPayload([
                'code' => $medicine->code,
                'name' => $medicine->name,
                'stock' => 4,
            ]))
            ->assertSessionHas('success');

        $this->assertSame(4, $medicine->fresh()->stock);
        $this->assertSame(4, $medicine->batches()->sum('quantity'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function medicinePayload(array $overrides = []): array
    {
        return array_merge([
            'code' => 'OBT-001',
            'name' => 'Paracetamol 500mg',
            'active_ingredient' => 'Paracetamol',
            'category' => 'Analgesik / Antipiretik',
            'unit' => 'Tablet',
            'strength' => '500 mg',
            'stock' => 100,
            'minimum_stock' => 10,
            'storage_location' => 'Rak A-01',
            'notes' => null,
            'status' => 'aktif',
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function medicineFormPayload(array $overrides = []): array
    {
        return array_merge($this->medicinePayload(), $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function batchPayload(Medicine $medicine, array $overrides = []): array
    {
        return array_merge([
            'medicine_id' => $medicine->id,
            'batch_number' => 'BTH-TEST-001',
            'location' => 'Gudang Utama Farmasi',
            'storage_location' => 'Rak A-01',
            'quantity' => 100,
            'initial_quantity' => 100,
            'unit_price' => 1000,
            'expired_at' => now()->addYear()->toDateString(),
            'received_at' => now()->toDateString(),
            'note' => null,
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function stockPayload(Medicine $medicine, array $overrides = []): array
    {
        return array_merge([
            'medicine_id' => $medicine->id,
            'batch_number' => 'BTH-NEW-001',
            'quantity' => 10,
            'unit_price' => 1500,
            'location' => 'Gudang Utama Farmasi',
            'storage_location' => 'Rak A-01',
            'expired_at' => now()->addYear()->toDateString(),
            'received_at' => now()->toDateString(),
            'note' => 'Penerimaan supplier',
        ], $overrides);
    }
}
