<?php

namespace Tests\Feature\Farmasi;

use App\Enums\MedicineStatus;
use App\Enums\PrescriptionStatus;
use App\Enums\StockMovementType;
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

class QueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/farmasi/antrean-resep')->assertRedirect(route('login'));
    }

    public function test_non_farmasi_cannot_access_queue(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/farmasi/antrean-resep')->assertForbidden();
    }

    public function test_pharmacist_can_view_queue_and_detail(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        $doctor = User::factory()->create(['role' => 'dokter', 'name' => 'dr. Andi']);
        $patient = $this->createPatient(['name' => 'Ahmad Fauzi']);
        $medicine = $this->createMedicine(['name' => 'Paracetamol 500 mg', 'stock' => 20]);
        $prescription = $this->createPrescription($patient, $doctor, PrescriptionStatus::Menunggu, 'RX-001');
        $this->addItem($prescription, $medicine, 5);

        $this->actingAs($pharmacist)
            ->get('/farmasi/antrean-resep')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('farmasi/antrean-resep')
                ->has('prescriptions.data', 1)
                ->where('prescriptions.data.0.number', 'RX-001')
                ->where('prescriptions.data.0.patient.name', 'Ahmad Fauzi'));

        $this->actingAs($pharmacist)
            ->get('/farmasi/antrean-resep/'.$prescription->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('farmasi/detail-resep')
                ->where('prescription.number', 'RX-001')
                ->where('prescription.status', 'menunggu')
                ->has('prescription.items', 1)
                ->where('prescription.items.0.medicine_name', 'Paracetamol 500 mg'));
    }

    public function test_accept_requires_checklist_and_moves_to_diterima(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        [$prescription] = $this->createBasicPrescription(PrescriptionStatus::Menunggu);

        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/terima', [])
            ->assertSessionHasErrors();

        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/terima', [
                'checklist' => [
                    'patient_identity' => '1',
                    'medicine_match' => '1',
                    'dose_instruction' => '1',
                    'allergy_interaction' => '1',
                    'availability_condition' => '1',
                ],
            ])
            ->assertRedirect('/farmasi/antrean-resep/'.$prescription->id);

        $prescription->refresh();
        $this->assertSame(PrescriptionStatus::Diterima, $prescription->status);
        $this->assertSame($pharmacist->id, $prescription->pharmacist_id);
        $this->assertIsArray($prescription->verification_checklist);
        $this->assertTrue($prescription->verification_checklist['patient_identity'] ?? false);
    }

    public function test_status_transitions_are_sequential(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        [$prescription] = $this->createBasicPrescription(PrescriptionStatus::Menunggu);

        // cannot skip to disiapkan
        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/siapkan')
            ->assertSessionHasErrors('status');
        $this->assertSame(PrescriptionStatus::Menunggu, $prescription->refresh()->status);

        $this->accept($pharmacist, $prescription);
        $this->actingAs($pharmacist)->post('/farmasi/antrean-resep/'.$prescription->id.'/siapkan')->assertRedirect();
        $this->assertSame(PrescriptionStatus::Disiapkan, $prescription->refresh()->status);

        $this->actingAs($pharmacist)->post('/farmasi/antrean-resep/'.$prescription->id.'/siap-diambil')->assertRedirect();
        $this->assertSame(PrescriptionStatus::SiapDiambil, $prescription->refresh()->status);
    }

    public function test_cancel_moves_prescription_to_dibatalkan_with_reason(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        [$prescription] = $this->createBasicPrescription(PrescriptionStatus::Menunggu);

        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/batalkan', ['reason' => 'Perlu revisi dokter karena alergi.'])
            ->assertRedirect('/farmasi/antrean-resep');

        $prescription->refresh();
        $this->assertSame(PrescriptionStatus::Dibatalkan, $prescription->status);
        $this->assertSame('Perlu revisi dokter karena alergi.', $prescription->notes);
        $this->assertSame('Perlu revisi dokter karena alergi.', $prescription->verification_checklist['cancel_reason'] ?? null);
    }

    public function test_handover_deducts_stock_records_movement_and_is_idempotent(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        [$prescription, $medicine] = $this->createBasicPrescription(PrescriptionStatus::SiapDiambil, 10, 4);
        StockBatch::create([
            'medicine_id' => $medicine->id,
            'batch_number' => 'B-001',
            'location' => 'Gudang Utama Farmasi',
            'quantity' => 10,
            'initial_quantity' => 10,
            'unit_price' => 0,
            'received_at' => today(),
        ]);

        $this->actingAs($pharmacist)
            ->get('/farmasi/antrean-resep/'.$prescription->id.'/serah-terima')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('farmasi/serah-terima')->where('prescription.number', $prescription->number));

        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/serah-terima', [
                'recipient_name' => 'Siti Penerima',
                'recipient_relationship' => 'Istri/Suami',
                'notes' => 'Edukasi aturan pakai disampaikan.',
                'confirmation' => '1',
            ])
            ->assertRedirect('/farmasi/antrean-resep');

        $prescription->refresh();
        $medicine->refresh();

        $this->assertSame(PrescriptionStatus::Diserahkan, $prescription->status);
        $this->assertSame('Siti Penerima', $prescription->recipient_name);
        $this->assertSame('Istri/Suami', $prescription->recipient_relationship);
        $this->assertNotNull($prescription->handover_confirmed_at);
        $this->assertSame($pharmacist->id, $prescription->pharmacist_id);
        $this->assertSame(6, $medicine->stock);

        $this->assertSame(6, StockBatch::where('medicine_id', $medicine->id)->value('quantity'));

        $movement = StockMovement::where('prescription_id', $prescription->id)->first();
        $this->assertNotNull($movement);
        $this->assertSame(StockMovementType::Keluar, $movement->type);
        $this->assertSame(4, $movement->quantity);
        $this->assertSame($medicine->id, $movement->medicine_id);
        $this->assertSame($pharmacist->id, $movement->user_id);

        // idempotent: second attempt must be rejected and not change stock/movement
        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/serah-terima', [
                'recipient_name' => 'Orang Lain',
                'recipient_relationship' => 'Anak',
                'confirmation' => '1',
            ])
            ->assertSessionHasErrors('handover');

        $this->assertSame(6, $medicine->refresh()->stock);
        $this->assertSame(1, StockMovement::where('prescription_id', $prescription->id)->count());
    }

    public function test_handover_rejected_when_stock_insufficient(): void
    {
        $pharmacist = User::factory()->create(['role' => 'farmasi']);
        [$prescription, $medicine] = $this->createBasicPrescription(PrescriptionStatus::SiapDiambil, 2, 5);
        StockBatch::create([
            'medicine_id' => $medicine->id,
            'batch_number' => 'B-002',
            'location' => 'Gudang Utama Farmasi',
            'quantity' => 2,
            'initial_quantity' => 2,
            'unit_price' => 0,
            'received_at' => today(),
        ]);

        $this->actingAs($pharmacist)
            ->post('/farmasi/antrean-resep/'.$prescription->id.'/serah-terima', [
                'recipient_name' => 'Penerima',
                'recipient_relationship' => 'Pasien Sendiri',
                'confirmation' => '1',
            ])
            ->assertSessionHasErrors('stock');

        $this->assertSame(PrescriptionStatus::SiapDiambil, $prescription->refresh()->status);
        $this->assertNull($prescription->handover_confirmed_at);
        $this->assertSame(2, $medicine->refresh()->stock);
        $this->assertSame(0, StockMovement::where('prescription_id', $prescription->id)->count());
    }

    private function accept(User $pharmacist, Prescription $prescription): void
    {
        $this->actingAs($pharmacist)->post('/farmasi/antrean-resep/'.$prescription->id.'/terima', [
            'checklist' => [
                'patient_identity' => '1',
                'medicine_match' => '1',
                'dose_instruction' => '1',
                'allergy_interaction' => '1',
                'availability_condition' => '1',
            ],
        ])->assertRedirect();
    }

    /**
     * @return array{0: Prescription, 1: Medicine}
     */
    private function createBasicPrescription(PrescriptionStatus $status, int $stock = 20, int $qty = 2): array
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $medicine = $this->createMedicine(['stock' => $stock]);
        $prescription = $this->createPrescription($patient, $doctor, $status);
        $this->addItem($prescription, $medicine, $qty);

        return [$prescription, $medicine];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createPatient(array $overrides = []): Patient
    {
        static $seq = 1;
        $n = $seq++;

        return Patient::create(array_merge([
            'medical_record_number' => 'RM-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT),
            'nik' => null,
            'name' => 'Pasien '.$n,
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'phone' => '0812345678'.$n,
            'address' => 'Alamat',
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createMedicine(array $overrides = []): Medicine
    {
        static $m = 1;
        $n = $m++;

        return Medicine::create(array_merge([
            'code' => 'OBT-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT),
            'name' => 'Obat '.$n,
            'active_ingredient' => 'Bahan Aktif',
            'category' => 'Umum',
            'unit' => 'tablet',
            'strength' => '500 mg',
            'stock' => 10,
            'minimum_stock' => 2,
            'status' => MedicineStatus::Aktif,
        ], $overrides));
    }

    private function createPrescription(Patient $patient, User $doctor, PrescriptionStatus $status, ?string $number = null): Prescription
    {
        static $rx = 1;
        $num = $number ?? 'RX-'.str_pad((string) $rx++, 3, '0', STR_PAD_LEFT);

        return Prescription::create([
            'number' => $num,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => $status,
            'notes' => null,
        ]);
    }

    private function addItem(Prescription $prescription, Medicine $medicine, int $qty = 1): PrescriptionItem
    {
        return PrescriptionItem::create([
            'prescription_id' => $prescription->id,
            'medicine_id' => $medicine->id,
            'dosage' => '1 tablet',
            'quantity' => $qty,
            'instructions' => '3x1 sesudah makan',
        ]);
    }
}
