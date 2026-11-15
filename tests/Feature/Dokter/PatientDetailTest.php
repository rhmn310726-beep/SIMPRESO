<?php

namespace Tests\Feature\Dokter;

use App\Models\Allergy;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PatientDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $patient = $this->createPatient();

        $this->get(route('dokter.pasien.show', $patient))->assertRedirect(route('login'));
    }

    public function test_non_dokter_cannot_access_patient_detail(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = $this->createPatient();

        $this->actingAs($admin)
            ->get(route('dokter.pasien.show', $patient))
            ->assertForbidden();
    }

    public function test_doctor_can_find_patients_from_detail_entry_page(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);

        $andi = $this->createPatient([
            'medical_record_number' => 'RM-002',
            'nik' => '3273250912800010',
            'name' => 'Andi Wijaya',
        ]);

        Allergy::create([
            'patient_id' => $andi->id,
            'allergen' => 'Penisilin',
        ]);

        $this->createPatient([
            'medical_record_number' => 'RM-003',
            'nik' => '3273250912800011',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);

        $this->actingAs($doctor)
            ->get(route('dokter.pasien.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/pilih-pasien')
                ->where('filters.search', '')
                ->has('patients.data', 2)
                ->where('patients.total', 2)
                ->where('patients.data.0.name', 'Andi Wijaya')
                ->where('patients.data.0.allergies_count', 1)
                ->where('patients.data.1.name', 'Siti Aminah'));

        $this->actingAs($doctor)
            ->get(route('dokter.pasien.index', ['search' => 'Siti']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/pilih-pasien')
                ->where('filters.search', 'Siti')
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Siti Aminah')
                ->where('patients.data.0.gender_label', 'Perempuan'));
    }

    public function test_doctor_can_view_patient_detail_with_clinical_history(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter', 'name' => 'dr. Rina']);
        $patient = $this->createPatient([
            'nik' => '3273250912800002',
            'name' => 'Ahmad Fauzi',
        ]);

        Allergy::create([
            'patient_id' => $patient->id,
            'allergen' => 'Penisilin',
            'note' => 'Urtikaria',
        ]);

        $medicine = $this->createMedicine();

        $prescription = Prescription::create([
            'number' => 'RX-001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'menunggu',
            'notes' => 'Berikan edukasi alergi.',
        ]);

        $prescription->items()->create([
            'medicine_id' => $medicine->id,
            'dosage' => '500 mg',
            'quantity' => 10,
            'instructions' => '3 x 1 tablet sesudah makan',
        ]);

        $this->createMedicine([
            'name' => 'Obat Nonaktif',
            'status' => 'nonaktif',
        ]);

        $this->actingAs($doctor)
            ->get(route('dokter.pasien.show', $patient))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/detail-pasien')
                ->where('patient.id', $patient->id)
                ->where('patient.medical_record_number', 'RM-001')
                ->where('patient.nik', '3273250912800002')
                ->where('patient.name', 'Ahmad Fauzi')
                ->where('patient.age', $patient->date_of_birth->age)
                ->where('patient.gender', 'L')
                ->where('patient.gender_label', 'Laki-laki')
                ->where('patient.phone', '081298430001')
                ->has('allergies', 1)
                ->where('allergies.0.allergen', 'Penisilin')
                ->where('allergies.0.note', 'Urtikaria')
                ->has('prescriptions', 1)
                ->where('prescriptions.0.number', 'RX-001')
                ->where('prescriptions.0.status', 'menunggu')
                ->where('prescriptions.0.status_label', 'Menunggu')
                ->where('prescriptions.0.doctor_name', 'dr. Rina')
                ->where('prescriptions.0.notes', 'Berikan edukasi alergi.')
                ->has('prescriptions.0.items', 1)
                ->where('prescriptions.0.items.0.medicine_name', 'Paracetamol 500 mg')
                ->where('prescriptions.0.items.0.quantity', 10)
                ->where('prescriptions.0.items.0.instructions', '3 x 1 tablet sesudah makan')
                ->has('medicines', 1)
                ->where('medicines.0.name', 'Paracetamol 500 mg')
                ->where('medicines.0.stock', 20));
    }

    public function test_doctor_can_update_patient_demographics(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();

        $this->actingAs($doctor)
            ->put(route('dokter.pasien.update', $patient), [
                'nik' => '3273250912800003',
                'name' => 'Ahmad Fauzi Baru',
                'date_of_birth' => '1985-05-12',
                'gender' => 'P',
                'phone' => '081200000000',
                'address' => 'Jl. Baru No. 1',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $patient->refresh();

        $this->assertSame('3273250912800003', $patient->nik);
        $this->assertSame('Ahmad Fauzi Baru', $patient->name);
        $this->assertSame('1985-05-12', $patient->date_of_birth->toDateString());
        $this->assertSame('P', $patient->gender->value);
        $this->assertSame('081200000000', $patient->phone);
        $this->assertSame('Jl. Baru No. 1', $patient->address);
    }

    public function test_patient_update_validates_identity_fields(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();

        $this->createPatient([
            'medical_record_number' => 'RM-002',
            'nik' => '3273250912800009',
        ]);

        $this->actingAs($doctor)
            ->from(route('dokter.pasien.show', $patient))
            ->put(route('dokter.pasien.update', $patient), [
                'nik' => '3273250912800009',
                'name' => '',
                'date_of_birth' => now()->addDay()->toDateString(),
                'gender' => 'X',
                'phone' => '',
            ])
            ->assertSessionHasErrors([
                'nik',
                'name',
                'date_of_birth',
                'gender',
                'phone',
            ]);

        $this->assertSame('Ahmad Fauzi', $patient->refresh()->name);
    }

    public function test_doctor_can_add_and_remove_patient_allergy(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();

        $this->actingAs($doctor)
            ->post(route('dokter.pasien.allergy.store', $patient), [
                'allergen' => 'Sulfa',
                'note' => 'Ruam makulopapular',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $allergy = $patient->allergies()->where('allergen', 'Sulfa')->firstOrFail();

        $this->assertSame('Ruam makulopapular', $allergy->note);

        $this->actingAs($doctor)
            ->from(route('dokter.pasien.show', $patient))
            ->post(route('dokter.pasien.allergy.store', $patient), [
                'allergen' => 'sulfa',
                'note' => null,
            ])
            ->assertSessionHasErrors('allergen');

        $this->assertSame(1, $patient->allergies()->count());

        $this->actingAs($doctor)
            ->delete(route('dokter.pasien.allergy.destroy', [$patient, $allergy]))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('allergies', ['id' => $allergy->id]);
    }

    public function test_doctor_cannot_delete_allergy_of_another_patient(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $other = $this->createPatient([
            'medical_record_number' => 'RM-002',
        ]);

        $allergy = Allergy::create([
            'patient_id' => $other->id,
            'allergen' => 'Penisilin',
        ]);

        $this->actingAs($doctor)
            ->delete(route('dokter.pasien.allergy.destroy', [$patient, $allergy]))
            ->assertNotFound();

        $this->assertDatabaseHas('allergies', ['id' => $allergy->id]);
    }

    public function test_doctor_can_create_prescription_for_patient(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $medicine = $this->createMedicine();

        $this->actingAs($doctor)
            ->post(route('dokter.pasien.resep.store', $patient), [
                'medicine_id' => $medicine->id,
                'dosage' => '500 mg',
                'quantity' => 10,
                'instructions' => '3 x 1 tablet sesudah makan',
                'notes' => 'Berikan edukasi alergi.',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $prescription = Prescription::query()->firstOrFail();

        $this->assertSame('RX-001', $prescription->number);
        $this->assertSame($patient->id, $prescription->patient_id);
        $this->assertSame($doctor->id, $prescription->doctor_id);
        $this->assertSame('menunggu', $prescription->status->value);
        $this->assertSame('Berikan edukasi alergi.', $prescription->notes);

        $this->assertDatabaseHas('prescription_items', [
            'prescription_id' => $prescription->id,
            'medicine_id' => $medicine->id,
            'dosage' => '500 mg',
            'quantity' => 10,
            'instructions' => '3 x 1 tablet sesudah makan',
        ]);

        $this->assertDatabaseHas('medicines', [
            'id' => $medicine->id,
            'stock' => 20,
        ]);

        $this->actingAs($doctor)
            ->post(route('dokter.pasien.resep.store', $patient), [
                'medicine_id' => $medicine->id,
                'dosage' => '500 mg',
                'quantity' => 2,
                'instructions' => '2 x 1 tablet',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame(
            'RX-002',
            Prescription::query()->orderByDesc('id')->firstOrFail()->number,
        );
    }

    public function test_prescription_creation_rejects_inactive_or_insufficient_stock(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient();
        $inactive = $this->createMedicine([
            'name' => 'Obat Nonaktif',
            'status' => 'nonaktif',
        ]);
        $empty = $this->createMedicine([
            'name' => 'Obat Kosong',
            'stock' => 0,
        ]);

        $this->actingAs($doctor)
            ->from(route('dokter.pasien.show', $patient))
            ->post(route('dokter.pasien.resep.store', $patient), [
                'medicine_id' => $inactive->id,
                'dosage' => '500 mg',
                'quantity' => 1,
                'instructions' => '3 x 1 tablet',
            ])
            ->assertSessionHasErrors('medicine_id');

        $this->actingAs($doctor)
            ->from(route('dokter.pasien.show', $patient))
            ->post(route('dokter.pasien.resep.store', $patient), [
                'medicine_id' => $empty->id,
                'dosage' => '500 mg',
                'quantity' => 1,
                'instructions' => '3 x 1 tablet',
            ])
            ->assertSessionHasErrors('quantity');

        $this->assertDatabaseCount('prescriptions', 0);
        $this->assertDatabaseCount('prescription_items', 0);
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
