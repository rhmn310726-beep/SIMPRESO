<?php

namespace Tests\Feature\Admin;

use App\Models\Allergy;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/laporan')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_reports(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/laporan')->assertForbidden();
    }

    public function test_admin_can_view_report_with_live_metrics(): void
    {
        $fixture = $this->createReportFixture();

        $this->actingAs($fixture['admin'])
            ->get('/admin/laporan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/laporan')
                ->where('period.start', now()->startOfMonth()->toDateString())
                ->where('period.end', now()->endOfMonth()->toDateString())
                ->where('stats.total_served', 1)
                ->where('stats.average_dispensing_minutes', 10)
                ->where('stats.risk_prescriptions', 1)
                ->where('stats.risk_follow_up_percent', 100)
                ->where('stats.formulary_spend', 10000)
                ->where('stats.expenditure_movements', 1)
                ->has('topMedicines', 1)
                ->where('topMedicines.0.name', $fixture['medicine']->name)
                ->where('topMedicines.0.category', 'Analgesik & Antipiretik')
                ->where('topMedicines.0.frequency', 1)
                ->where('topMedicines.0.units', 10)
                ->where('topMedicines.0.value', 10000)
                ->where('topMedicines.0.status_label', 'Aktif')
                ->where('topMedicinesTotal', 1)
                ->where('categories.0', 'Analgesik & Antipiretik'));
    }

    public function test_report_can_be_filtered_by_date_range(): void
    {
        $fixture = $this->createReportFixture();
        $createdAt = now()->subMonthNoOverflow()->startOfMonth()->addDays(2)->setTime(10, 0);
        $fixture['prescription']->forceFill([
            'created_at' => $createdAt,
            'handover_confirmed_at' => $createdAt->copy()->addMinutes(15),
        ])->save();

        $start = $createdAt->copy()->startOfMonth()->toDateString();
        $end = $createdAt->copy()->endOfMonth()->toDateString();

        $this->actingAs($fixture['admin'])
            ->get(route('admin.laporan.index', ['start' => $start, 'end' => $end]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('period.start', $start)
                ->where('period.end', $end)
                ->where('stats.total_served', 1)
                ->has('topMedicines', 1));

        $this->actingAs($fixture['admin'])
            ->get('/admin/laporan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total_served', 0)
                ->has('topMedicines', 0));
    }

    public function test_top_medicines_can_be_filtered_by_category(): void
    {
        $fixture = $this->createReportFixture();

        $this->actingAs($fixture['admin'])
            ->get(route('admin.laporan.index', ['category' => 'Antibiotik']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.category', 'Antibiotik')
                ->has('topMedicines', 0)
                ->where('topMedicinesTotal', 0));

        $this->actingAs($fixture['admin'])
            ->get(route('admin.laporan.index', ['category' => 'Analgesik & Antipiretik']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('topMedicines', 1)
                ->where('topMedicines.0.name', $fixture['medicine']->name));
    }

    public function test_report_date_range_is_validated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->from('/admin/laporan')
            ->get('/admin/laporan?start=2026-02-10&end=2026-02-01')
            ->assertSessionHasErrors('end');
    }

    public function test_admin_can_export_report(): void
    {
        $fixture = $this->createReportFixture();

        $response = $this->actingAs($fixture['admin'])
            ->get(route('admin.laporan.export'));

        $response->assertOk();
        $response->assertDownload();
        $this->assertStringContainsString('Laporan Farmasi & E-Prescribing', $response->streamedContent());
        $this->assertStringContainsString($fixture['medicine']->name, $response->streamedContent());
    }

    /**
     * @return array{admin: User, doctor: User, patient: Patient, medicine: Medicine, prescription: Prescription}
     */
    private function createReportFixture(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $doctor = User::factory()->create(['role' => 'dokter']);

        $patient = Patient::create([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'phone' => '081234567890',
        ]);

        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penisilin']);

        $medicine = Medicine::create([
            'name' => 'Paracetamol 500mg',
            'active_ingredient' => 'Paracetamol',
            'category' => 'Analgesik & Antipiretik',
            'unit' => 'Tablet',
            'stock' => 100,
            'minimum_stock' => 10,
            'status' => 'aktif',
        ]);

        StockBatch::create([
            'medicine_id' => $medicine->id,
            'batch_number' => 'BTH-001',
            'location' => 'Gudang Utama Farmasi',
            'quantity' => 100,
            'initial_quantity' => 100,
            'unit_price' => 1000,
            'received_at' => now()->toDateString(),
        ]);

        $createdAt = now()->startOfMonth()->addHours(9);

        $prescription = Prescription::create([
            'number' => 'RX-001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'diserahkan',
            'handover_confirmed_at' => $createdAt->copy()->addMinutes(10),
        ]);

        $prescription->forceFill(['created_at' => $createdAt])->save();

        PrescriptionItem::create([
            'prescription_id' => $prescription->id,
            'medicine_id' => $medicine->id,
            'dosage' => '3x1',
            'quantity' => 10,
            'instructions' => 'Sesudah makan',
        ]);

        $movement = StockMovement::create([
            'medicine_id' => $medicine->id,
            'type' => 'keluar',
            'quantity' => 10,
            'prescription_id' => $prescription->id,
            'user_id' => $admin->id,
        ]);

        $movement->forceFill(['created_at' => $createdAt])->save();

        return compact('admin', 'doctor', 'patient', 'medicine', 'prescription');
    }
}
