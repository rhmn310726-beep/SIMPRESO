<?php

namespace Tests\Feature\Admin;

use App\Models\Medicine;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MedicineTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/obat')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_medicine_management(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/obat')->assertForbidden();
    }

    public function test_admin_can_view_medicine_list_with_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Medicine::create($this->payload([
            'code' => 'OBT-001',
            'name' => 'Paracetamol 500mg',
            'status' => 'aktif',
        ]));

        Medicine::create($this->payload([
            'code' => 'OBT-002',
            'name' => 'Amoxicillin 500mg',
            'status' => 'nonaktif',
        ]));

        $this->actingAs($admin)
            ->get('/admin/obat')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/obat')
                ->has('medicines.data', 2)
                ->where('stats.total', 2)
                ->where('stats.active', 1)
                ->where('stats.inactive', 1)
                ->where('next_code', 'OBT-003')
                ->has('categories'));
    }

    public function test_admin_can_create_medicine(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->from(route('admin.obat.index'))
            ->post(route('admin.obat.store'), $this->payload([
                'code' => 'OBT-007',
                'name' => 'Ce Fixime 100mg',
            ]))
            ->assertRedirect(route('admin.obat.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('medicines', [
            'code' => 'OBT-007',
            'name' => 'Ce Fixime 100mg',
            'status' => 'aktif',
        ]);
    }

    public function test_medicine_code_must_be_unique(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Medicine::create($this->payload(['code' => 'OBT-001']));

        $this->actingAs($admin)
            ->from(route('admin.obat.index'))
            ->post(route('admin.obat.store'), $this->payload(['code' => 'OBT-001']))
            ->assertSessionHasErrors('code');

        $this->assertDatabaseCount('medicines', 1);
    }

    public function test_admin_can_update_medicine_without_changing_its_code(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->payload([
            'code' => 'OBT-001',
            'name' => 'Paracetamol 500mg',
            'stock' => 10,
        ]));

        $this->actingAs($admin)
            ->from(route('admin.obat.index'))
            ->put(route('admin.obat.update', $medicine), $this->payload([
                'code' => 'OBT-001',
                'name' => 'Paracetamol 650mg',
                'stock' => 25,
                'status' => 'nonaktif',
            ]))
            ->assertRedirect(route('admin.obat.index'))
            ->assertSessionHas('success');

        $medicine->refresh();

        $this->assertSame('Paracetamol 650mg', $medicine->name);
        $this->assertSame(25, $medicine->stock);
        $this->assertSame('nonaktif', $medicine->status->value);
    }

    public function test_admin_can_delete_medicine_without_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->payload(['code' => 'OBT-001']));

        $this->actingAs($admin)
            ->from(route('admin.obat.index'))
            ->delete(route('admin.obat.destroy', $medicine))
            ->assertRedirect(route('admin.obat.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('medicines', ['id' => $medicine->id]);
    }

    public function test_delete_is_blocked_when_medicine_has_stock_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $medicine = Medicine::create($this->payload(['code' => 'OBT-001']));

        StockMovement::create([
            'medicine_id' => $medicine->id,
            'type' => 'masuk',
            'quantity' => 10,
            'user_id' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.obat.index'))
            ->delete(route('admin.obat.destroy', $medicine))
            ->assertRedirect(route('admin.obat.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('medicines', ['id' => $medicine->id]);
    }

    public function test_medicine_list_can_be_filtered_by_stock_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Medicine::create($this->payload([
            'code' => 'OBT-001',
            'name' => 'Stok Aman',
            'stock' => 100,
            'minimum_stock' => 10,
        ]));

        Medicine::create($this->payload([
            'code' => 'OBT-002',
            'name' => 'Stok Kritis',
            'stock' => 5,
            'minimum_stock' => 10,
        ]));

        Medicine::create($this->payload([
            'code' => 'OBT-003',
            'name' => 'Stok Habis',
            'stock' => 0,
            'minimum_stock' => 10,
        ]));

        $this->actingAs($admin)
            ->get('/admin/obat?status=kritis')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Stok Kritis'));

        $this->actingAs($admin)
            ->get('/admin/obat?status=habis')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('medicines.data', 1)
                ->where('medicines.data.0.name', 'Stok Habis'));
    }

    public function test_admin_can_export_medicine_formulary(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Medicine::create($this->payload(['code' => 'OBT-001', 'name' => 'Paracetamol 500mg']));

        $response = $this->actingAs($admin)->get(route('admin.obat.export'));

        $response->assertOk();
        $response->assertDownload('formularium-obat.csv');
        $this->assertStringContainsString('Paracetamol 500mg', $response->streamedContent());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'code' => 'OBT-001',
            'name' => 'Paracetamol 500mg',
            'active_ingredient' => 'Paracetamol',
            'category' => 'Analgesik / Antipiretik',
            'unit' => 'Tablet',
            'strength' => '500 mg',
            'stock' => 50,
            'minimum_stock' => 10,
            'storage_location' => 'Rak A-01',
            'notes' => null,
            'status' => 'aktif',
        ], $overrides);
    }
}
