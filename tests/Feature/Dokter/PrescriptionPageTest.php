<?php

namespace Tests\Feature\Dokter;

use App\Models\Allergy;
use App\Models\AllergyRule;
use App\Models\DrugInteraction;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PrescriptionPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $patient = $this->createPatient();

        $this->get(route('dokter.resep.create', ['patient' => $patient->id]))
            ->assertRedirect(route('login'));
    }

    public function test_non_dokter_cannot_access_prescription_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = $this->createPatient();

        $this->actingAs($admin)
            ->get(route('dokter.resep.create', ['patient' => $patient->id]))
            ->assertForbidden();

        $this->actingAs($admin)
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
                'items' => [
                    [
                        'medicine_id' => $this->createMedicine()->id,
                        'dosage' => '500 mg',
                        'quantity' => 1,
                        'instructions' => '3 x 1 tablet',
                    ],
                ],
            ])
            ->assertForbidden();
    }

    public function test_doctor_must_pick_patient_before_writing_prescription(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);

        $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);
        $andi = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Andi Wijaya',
        ]);

        Allergy::create([
            'patient_id' => $andi->id,
            'allergen' => 'Penisilin',
        ]);

        $this->actingAs($doctor)
            ->get(route('dokter.resep.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/buat-resep')
                ->where('patient', null)
                ->where('patients_count', 2)
                ->has('patient_options.data', 2)
                ->where('patient_options.data.0.name', 'Andi Wijaya')
                ->where('patient_options.data.0.allergies_count', 1)
                ->where('patient_options.data.1.name', 'Siti Aminah')
                ->where('filters.search', ''));

        $this->actingAs($doctor)
            ->get(route('dokter.resep.create', ['search' => 'Siti']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/buat-resep')
                ->where('filters.search', 'Siti')
                ->has('patient_options.data', 1)
                ->where('patient_options.data.0.name', 'Siti Aminah'));
    }

    public function test_doctor_can_open_formularium_for_selected_patient(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter', 'name' => 'dr. Rina']);
        $patient = $this->createPatient(['name' => 'Ahmad Fauzi']);

        Allergy::create([
            'patient_id' => $patient->id,
            'allergen' => 'Penisilin',
            'note' => 'Urtikaria',
        ]);

        $paracetamol = $this->createMedicine([
            'name' => 'Paracetamol 500 mg',
            'category' => 'Analgesik',
            'strength' => '500 mg',
        ]);
        $amoxicillin = $this->createMedicine([
            'name' => 'Amoxicillin 500 mg',
            'active_ingredient' => 'Amoxicillin',
            'category' => 'Antibiotik',
            'strength' => '500 mg',
            'stock' => 4,
        ]);
        $this->createMedicine([
            'name' => 'Obat Nonaktif',
            'status' => 'nonaktif',
        ]);

        AllergyRule::create([
            'active_ingredient' => 'Amoxicillin',
            'drug_group' => 'Penisilin',
            'allergen_name' => 'Penisilin',
            'severity' => 'berat',
            'example_medicines' => ['Amoxicillin', 'Ampisilin'],
        ]);

        DrugInteraction::create([
            'medicine_a_id' => $paracetamol->id,
            'medicine_b_id' => $amoxicillin->id,
            'severity' => 'sedang',
            'recommendation' => 'Pantau fungsi hati dan beri jarak konsumsi.',
        ]);

        $this->actingAs($doctor)
            ->get(route('dokter.resep.create', ['patient' => $patient->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/buat-resep')
                ->where('patient.id', $patient->id)
                ->where('patient.name', 'Ahmad Fauzi')
                ->where('patient.medical_record_number', 'RM-001')
                ->has('patient.allergies', 1)
                ->where('patient.allergies.0.allergen', 'Penisilin')
                ->where('patient.allergies.0.note', 'Urtikaria')
                ->has('medicines', 2)
                ->where('medicines.0.name', 'Amoxicillin 500 mg')
                ->where('medicines.0.stock', 4)
                ->where('medicines.1.name', 'Paracetamol 500 mg')
                ->has('allergy_rules', 1)
                ->where('allergy_rules.0.allergen_name', 'Penisilin')
                ->where('allergy_rules.0.severity', 'berat')
                ->where('allergy_rules.0.example_medicines.0', 'Amoxicillin')
                ->has('interactions', 1)
                ->where('interactions.0.severity', 'sedang')
                ->where('interactions.0.recommendation', 'Pantau fungsi hati dan beri jarak konsumsi.'));
    }

    public function test_doctor_can_send_multi_item_prescription_without_reducing_stock(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $paracetamol = $this->createMedicine();
        $amoxicillin = $this->createMedicine([
            'name' => 'Amoxicillin 500 mg',
            'active_ingredient' => 'Amoxicillin',
            'stock' => 12,
        ]);

        $this->actingAs($doctor)
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
                'notes' => 'Berikan edukasi alergi.',
                'items' => [
                    [
                        'medicine_id' => $paracetamol->id,
                        'dosage' => '500 mg',
                        'quantity' => 10,
                        'instructions' => '3 x 1 tablet sesudah makan',
                    ],
                    [
                        'medicine_id' => $amoxicillin->id,
                        'dosage' => '500 mg',
                        'quantity' => 6,
                        'instructions' => '3 x 1 tablet selama 5 hari',
                    ],
                ],
            ])
            ->assertRedirect(route('dokter.pasien.show', $patient))
            ->assertSessionHas('success');

        $prescription = Prescription::query()->firstOrFail();

        $this->assertSame('RX-001', $prescription->number);
        $this->assertSame($patient->id, $prescription->patient_id);
        $this->assertSame($doctor->id, $prescription->doctor_id);
        $this->assertSame('menunggu', $prescription->status->value);
        $this->assertSame('Berikan edukasi alergi.', $prescription->notes);
        $this->assertSame(2, $prescription->items()->count());

        $this->assertDatabaseHas('prescription_items', [
            'prescription_id' => $prescription->id,
            'medicine_id' => $paracetamol->id,
            'dosage' => '500 mg',
            'quantity' => 10,
            'instructions' => '3 x 1 tablet sesudah makan',
        ]);

        $this->assertDatabaseHas('prescription_items', [
            'prescription_id' => $prescription->id,
            'medicine_id' => $amoxicillin->id,
            'dosage' => '500 mg',
            'quantity' => 6,
            'instructions' => '3 x 1 tablet selama 5 hari',
        ]);

        $this->assertDatabaseHas('medicines', ['id' => $paracetamol->id, 'stock' => 20]);
        $this->assertDatabaseHas('medicines', ['id' => $amoxicillin->id, 'stock' => 12]);
    }

    public function test_prescription_rejects_inactive_medicine(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $inactive = $this->createMedicine([
            'name' => 'Obat Nonaktif',
            'status' => 'nonaktif',
        ]);

        $this->actingAs($doctor)
            ->from(route('dokter.resep.create', ['patient' => $patient->id]))
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
                'items' => [
                    [
                        'medicine_id' => $inactive->id,
                        'dosage' => '500 mg',
                        'quantity' => 1,
                        'instructions' => '3 x 1 tablet',
                    ],
                ],
            ])
            ->assertSessionHasErrors('items.0.medicine_id');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_prescription_rejects_insufficient_stock(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $empty = $this->createMedicine([
            'name' => 'Obat Kosong',
            'stock' => 2,
        ]);

        $this->actingAs($doctor)
            ->from(route('dokter.resep.create', ['patient' => $patient->id]))
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
                'items' => [
                    [
                        'medicine_id' => $empty->id,
                        'dosage' => '500 mg',
                        'quantity' => 5,
                        'instructions' => '3 x 1 tablet',
                    ],
                ],
            ])
            ->assertSessionHasErrors('items.0.quantity');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertDatabaseCount('prescription_items', 0);
    }

    public function test_prescription_validates_items_and_duplicate_medicine(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $medicine = $this->createMedicine();

        $this->actingAs($doctor)
            ->from(route('dokter.resep.create', ['patient' => $patient->id]))
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
            ])
            ->assertSessionHasErrors('items');

        $this->actingAs($doctor)
            ->from(route('dokter.resep.create', ['patient' => $patient->id]))
            ->post(route('dokter.resep.store'), [
                'patient_id' => $patient->id,
                'items' => [
                    [
                        'medicine_id' => $medicine->id,
                        'dosage' => '500 mg',
                        'quantity' => 1,
                        'instructions' => '3 x 1 tablet',
                    ],
                    [
                        'medicine_id' => $medicine->id,
                        'dosage' => '500 mg',
                        'quantity' => 2,
                        'instructions' => '2 x 1 tablet',
                    ],
                ],
            ])
            ->assertSessionHasErrors('items.1.medicine_id');

        $this->assertDatabaseCount('prescriptions', 0);
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
}
