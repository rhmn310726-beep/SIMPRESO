<?php

namespace Tests\Feature\Admin;

use App\Models\Allergy;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PatientTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/pasien')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_patient_management(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/pasien')->assertForbidden();
    }

    public function test_admin_can_view_patient_list_with_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $withAllergy = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
            'gender' => 'L',
        ]);

        Allergy::create(['patient_id' => $withAllergy->id, 'allergen' => 'Penisilin']);

        $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);

        $this->actingAs($admin)
            ->get('/admin/pasien')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/pasien')
                ->has('patients.data', 2)
                ->where('stats.total', 2)
                ->where('stats.with_allergies', 1)
                ->where('stats.allergy_percent', 50)
                ->where('stats.new_this_month', 2)
                ->where('next_medical_record_number', 'RM-003')
                ->where('patients.data.0.medical_record_number', 'RM-001')
                ->where('patients.data.0.gender_label', 'Laki-laki')
                ->where('patients.data.0.allergies.0', 'Penisilin')
                ->where('patients.data.1.gender_label', 'Perempuan'));
    }

    public function test_admin_can_register_patient_with_allergies(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->from(route('admin.pasien.index'))
            ->post(route('admin.pasien.store'), [
                'medical_record_number' => 'RM-007',
                'nik' => '3201234567890001',
                'name' => 'Ahmad Fauzi',
                'age' => 30,
                'gender' => 'L',
                'phone' => '081234567890',
                'allergy' => 'Penisilin, Sulfa, penisilin',
            ])
            ->assertRedirect(route('admin.pasien.index'))
            ->assertSessionHas('success');

        $patient = Patient::query()->where('medical_record_number', 'RM-007')->firstOrFail();

        $this->assertSame('Ahmad Fauzi', $patient->name);
        $this->assertSame('3201234567890001', $patient->nik);
        $this->assertSame(30, $patient->date_of_birth->age);
        $this->assertSame('L', $patient->gender->value);

        $this->assertDatabaseCount('allergies', 2);
        $this->assertDatabaseHas('allergies', [
            'patient_id' => $patient->id,
            'allergen' => 'Penisilin',
        ]);
        $this->assertDatabaseHas('allergies', [
            'patient_id' => $patient->id,
            'allergen' => 'Sulfa',
        ]);
    }

    public function test_patient_identity_fields_are_validated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $existing = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'nik' => '3201234567890001',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.pasien.index'))
            ->post(route('admin.pasien.store'), [
                'medical_record_number' => $existing->medical_record_number,
                'nik' => $existing->nik,
                'name' => '',
                'age' => -1,
                'gender' => 'X',
                'phone' => '',
            ])
            ->assertSessionHasErrors([
                'medical_record_number',
                'nik',
                'name',
                'age',
                'gender',
                'phone',
            ]);

        $this->assertDatabaseCount('patients', 1);
    }

    public function test_admin_can_update_patient_and_sync_allergies(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Nama Lama',
        ]);

        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penisilin']);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Sulfa']);

        $this->actingAs($admin)
            ->from(route('admin.pasien.index'))
            ->put(route('admin.pasien.update', $patient), [
                'medical_record_number' => 'RM-001',
                'nik' => $patient->nik,
                'name' => 'Nama Baru',
                'age' => 45,
                'gender' => 'P',
                'phone' => '081298765432',
                'allergy' => 'Penisilin',
            ])
            ->assertRedirect(route('admin.pasien.index'))
            ->assertSessionHas('success');

        $patient->refresh();

        $this->assertSame('Nama Baru', $patient->name);
        $this->assertSame(45, $patient->date_of_birth->age);
        $this->assertSame('P', $patient->gender->value);
        $this->assertDatabaseHas('allergies', [
            'patient_id' => $patient->id,
            'allergen' => 'Penisilin',
        ]);
        $this->assertDatabaseMissing('allergies', [
            'patient_id' => $patient->id,
            'allergen' => 'Sulfa',
        ]);
    }

    public function test_admin_can_delete_patient_without_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = $this->createPatient(['medical_record_number' => 'RM-001']);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penisilin']);

        $this->actingAs($admin)
            ->from(route('admin.pasien.index'))
            ->delete(route('admin.pasien.destroy', $patient))
            ->assertRedirect(route('admin.pasien.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('patients', ['id' => $patient->id]);
        $this->assertDatabaseMissing('allergies', ['patient_id' => $patient->id]);
    }

    public function test_delete_is_blocked_when_patient_has_prescription_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $doctor = User::factory()->create(['role' => 'dokter']);
        $patient = $this->createPatient(['medical_record_number' => 'RM-001']);

        Prescription::create([
            'number' => 'RX-001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'menunggu',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.pasien.index'))
            ->delete(route('admin.pasien.destroy', $patient))
            ->assertRedirect(route('admin.pasien.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('patients', ['id' => $patient->id]);
    }

    public function test_patient_list_can_be_filtered_and_searched(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $withAllergy = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
            'gender' => 'L',
        ]);
        Allergy::create(['patient_id' => $withAllergy->id, 'allergen' => 'Penisilin']);

        $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);

        $this->actingAs($admin)
            ->get('/admin/pasien?allergy=1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Ahmad Fauzi'));

        $this->actingAs($admin)
            ->get('/admin/pasien?gender=P')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Siti Aminah'));

        $this->actingAs($admin)
            ->get('/admin/pasien?search=RM-001')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Ahmad Fauzi'));
    }

    public function test_admin_can_export_patient_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $patient = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
        ]);
        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penisilin']);

        $response = $this->actingAs($admin)->get(route('admin.pasien.export'));

        $response->assertOk();
        $response->assertDownload('data-pasien.csv');
        $this->assertStringContainsString('Ahmad Fauzi', $response->streamedContent());
        $this->assertStringContainsString('Penisilin', $response->streamedContent());
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createPatient(array $overrides = []): Patient
    {
        return Patient::create(array_merge([
            'medical_record_number' => 'RM-001',
            'nik' => null,
            'name' => 'Pasien Uji',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'phone' => '081234567890',
        ], $overrides));
    }
}
