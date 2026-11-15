<?php

namespace Tests\Feature\Dokter;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PrescriptionHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('dokter.riwayat-resep.index'))
            ->assertRedirect(route('login'));
    }

    public function test_non_dokter_cannot_access_prescription_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('dokter.riwayat-resep.index'))
            ->assertForbidden();

        $this->actingAs($admin)
            ->get(route('dokter.riwayat-resep.export'))
            ->assertForbidden();
    }

    public function test_doctor_only_sees_own_prescriptions_and_monthly_stats(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter', 'name' => 'dr. Rina']);
        $otherDoctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient(['name' => 'Ahmad Fauzi']);
        $otherPatient = $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Pasien Dokter Lain',
        ]);
        $now = Carbon::now();

        $this->createPrescription($doctor, $patient, 'RX-001', 'diserahkan', $now, 2, $now);
        $this->createPrescription($doctor, $patient, 'RX-002', 'menunggu', $now);
        $this->createPrescription($otherDoctor, $otherPatient, 'RX-003', 'diserahkan', $now, 1, $now);

        $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/riwayat-resep')
                ->where('prescriptions.total', 2)
                ->where('stats.total', 2)
                ->where('stats.handed_over', 1)
                ->where('stats.in_progress', 1)
                ->where('stats.cancelled', 0)
                ->has('stats.handed_over_percent')
                ->where('filters.search', '')
                ->where('filters.status', '')
                ->has('status_options', 6)
                ->has('prescriptions.data', 2)
                ->where('prescriptions.data.0.number', 'RX-002')
                ->where('prescriptions.data.0.status', 'menunggu')
                ->where('prescriptions.data.0.status_label', 'Menunggu')
                ->where('prescriptions.data.0.patient.name', 'Ahmad Fauzi')
                ->where('prescriptions.data.0.items_count', 1)
                ->has('prescriptions.data.0.items', 1)
                ->where('prescriptions.data.0.items.0.medicine_name', 'Obat RX-002 1')
                ->where('prescriptions.data.1.number', 'RX-001')
                ->where('prescriptions.data.1.status', 'diserahkan')
                ->where('prescriptions.data.1.items_count', 2)
                ->has('prescriptions.data.1.items', 2)
                ->where('prescriptions.data.1.handover_at_label', $now->locale('id')->translatedFormat('j M Y, H:i').' WIB'));
    }

    public function test_doctor_can_filter_history_by_search_status_and_date(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $andi = $this->createPatient([
            'medical_record_number' => 'RM-100',
            'name' => 'Andi Wijaya',
        ]);
        $siti = $this->createPatient([
            'medical_record_number' => 'RM-101',
            'name' => 'Siti Aminah',
        ]);
        $now = Carbon::now();

        $this->createPrescription($doctor, $andi, 'RX-010', 'diserahkan', $now, 1, $now);
        $this->createPrescription($doctor, $siti, 'RX-011', 'menunggu', $now->copy()->subDays(5));
        $this->createPrescription($doctor, $andi, 'RX-012', 'dibatalkan', $now->copy()->subDays(40));

        $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.index', ['search' => 'Siti']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.search', 'Siti')
                ->where('prescriptions.total', 1)
                ->where('prescriptions.data.0.number', 'RX-011'));

        $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.index', ['search' => 'RX-010']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('prescriptions.total', 1)
                ->where('prescriptions.data.0.number', 'RX-010'));

        $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.index', ['status' => 'dibatalkan']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.status', 'dibatalkan')
                ->where('prescriptions.total', 1)
                ->where('prescriptions.data.0.number', 'RX-012'));

        $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.index', [
                'from' => $now->copy()->subDays(10)->toDateString(),
                'to' => $now->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.from', $now->copy()->subDays(10)->toDateString())
                ->where('filters.to', $now->toDateString())
                ->where('prescriptions.total', 2)
                ->where('prescriptions.data.0.number', 'RX-010')
                ->where('prescriptions.data.1.number', 'RX-011'));
    }

    public function test_doctor_can_export_filtered_history_as_csv(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $otherDoctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient(['name' => 'Ahmad Fauzi']);
        $otherPatient = $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Pasien Dokter Lain',
        ]);
        $now = Carbon::now();

        $this->createPrescription($doctor, $patient, 'RX-020', 'diserahkan', $now, 2, $now);
        $this->createPrescription($otherDoctor, $otherPatient, 'RX-021', 'diserahkan', $now, 1, $now);

        $response = $this->actingAs($doctor)
            ->get(route('dokter.riwayat-resep.export'));

        $response->assertOk()
            ->assertDownload()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();

        $this->assertStringContainsString('No. Resep', $content);
        $this->assertStringContainsString('RX-020', $content);
        $this->assertStringContainsString('Ahmad Fauzi', $content);
        $this->assertStringNotContainsString('RX-021', $content);
        $this->assertStringNotContainsString('Pasien Dokter Lain', $content);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createPatient(array $overrides = []): Patient
    {
        return Patient::create(array_merge([
            'medical_record_number' => 'RM-001',
            'nik' => null,
            'name' => 'Ahmad Fauzi',
            'date_of_birth' => '1980-05-12',
            'gender' => 'L',
            'phone' => '081298430001',
            'address' => 'Jl. Merdeka No. 12',
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createMedicine(array $overrides = []): Medicine
    {
        return Medicine::create(array_merge([
            'name' => 'Paracetamol 500 mg',
            'active_ingredient' => 'Paracetamol',
            'unit' => 'Tablet',
            'stock' => 20,
            'minimum_stock' => 5,
            'status' => 'aktif',
        ], $overrides));
    }

    private function createPrescription(
        User $doctor,
        Patient $patient,
        string $number,
        string $status,
        Carbon $createdAt,
        int $itemCount = 1,
        ?Carbon $handoverAt = null,
    ): Prescription {
        $prescription = Prescription::create([
            'number' => $number,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => $status,
            'notes' => null,
            'handover_confirmed_at' => $handoverAt,
        ]);

        $prescription->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();

        for ($index = 1; $index <= $itemCount; $index++) {
            $medicine = $this->createMedicine([
                'name' => "Obat {$number} {$index}",
                'active_ingredient' => "Bahan {$number} {$index}",
            ]);

            PrescriptionItem::create([
                'prescription_id' => $prescription->id,
                'medicine_id' => $medicine->id,
                'dosage' => '500 mg',
                'quantity' => $index,
                'instructions' => '3 x 1 tablet sesudah makan',
            ]);
        }

        return $prescription->refresh();
    }
}
