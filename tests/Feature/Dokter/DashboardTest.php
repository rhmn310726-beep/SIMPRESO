<?php

namespace Tests\Feature\Dokter;

use App\Models\Allergy;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/dokter')->assertRedirect(route('login'));
    }

    public function test_non_dokter_cannot_access_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->get('/dokter')->assertForbidden();
    }

    public function test_doctor_dashboard_renders_live_today_queue(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter', 'name' => 'dr. Rina']);
        $otherDoctor = User::factory()->create(['role' => 'dokter']);

        $ahmad = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
            'gender' => 'L',
        ]);

        $siti = $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);

        Allergy::create(['patient_id' => $siti->id, 'allergen' => 'Penisilin']);

        $this->createPatient([
            'medical_record_number' => 'RM-003',
            'name' => 'Pasien Kemarin',
            'gender' => 'L',
        ], now()->subDay());

        Prescription::create([
            'number' => 'RX-001',
            'patient_id' => $ahmad->id,
            'doctor_id' => $doctor->id,
            'status' => 'menunggu',
        ]);

        Prescription::create([
            'number' => 'RX-002',
            'patient_id' => $siti->id,
            'doctor_id' => $otherDoctor->id,
            'status' => 'diterima',
        ]);

        $this->actingAs($doctor)
            ->get('/dokter')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dokter/daftar-pasien')
                ->where('today', now()->locale('id')->translatedFormat('l, j F Y'))
                ->where('stats.total_today', 2)
                ->where('stats.done_today', 1)
                ->where('stats.pending_today', 1)
                ->where('stats.progress_percent', 50)
                ->where('stats.prescriptions_today', 1)
                ->where('stats.waiting_pharmacy', 1)
                ->has('patients.data', 2)
                ->where('patients.data.0.medical_record_number', 'RM-001')
                ->where('patients.data.0.name', 'Ahmad Fauzi')
                ->where('patients.data.0.gender', 'L')
                ->where('patients.data.0.gender_label', 'Laki-laki')
                ->where('patients.data.0.queue_number', 1)
                ->where('patients.data.0.has_prescription_today', true)
                ->has('patients.data.0.allergies', 0)
                ->where('patients.data.1.medical_record_number', 'RM-002')
                ->where('patients.data.1.name', 'Siti Aminah')
                ->where('patients.data.1.gender_label', 'Perempuan')
                ->where('patients.data.1.queue_number', 2)
                ->where('patients.data.1.has_prescription_today', false)
                ->where('patients.data.1.allergies.0', 'Penisilin')
                ->where('status_counts.semua', 2)
                ->where('status_counts.sudah', 1)
                ->where('status_counts.belum', 1)
                ->where('filters.search', '')
                ->where('filters.gender', '')
                ->where('filters.status', ''));
    }

    public function test_doctor_queue_can_be_filtered_by_gender_status_and_search(): void
    {
        $doctor = User::factory()->create(['role' => 'dokter']);

        $ahmad = $this->createPatient([
            'medical_record_number' => 'RM-001',
            'name' => 'Ahmad Fauzi',
            'gender' => 'L',
        ]);

        $this->createPatient([
            'medical_record_number' => 'RM-002',
            'name' => 'Siti Aminah',
            'gender' => 'P',
        ]);

        Prescription::create([
            'number' => 'RX-001',
            'patient_id' => $ahmad->id,
            'doctor_id' => $doctor->id,
            'status' => 'menunggu',
        ]);

        $this->actingAs($doctor)
            ->get('/dokter?gender=P')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Siti Aminah')
                ->where('status_counts.semua', 1)
                ->where('status_counts.sudah', 0)
                ->where('status_counts.belum', 1)
                ->where('filters.gender', 'P'));

        $this->actingAs($doctor)
            ->get('/dokter?status=sudah')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Ahmad Fauzi')
                ->where('filters.status', 'sudah'));

        $this->actingAs($doctor)
            ->get('/dokter?status=belum')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Siti Aminah')
                ->where('filters.status', 'belum'));

        $this->actingAs($doctor)
            ->get('/dokter?search=RM-001')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 1)
                ->where('patients.data.0.name', 'Ahmad Fauzi')
                ->where('filters.search', 'RM-001'));

        $this->actingAs($doctor)
            ->get('/dokter?search=Tidak Ada')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('patients.data', 0)
                ->where('status_counts.semua', 0)
                ->where('stats.total_today', 2));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createPatient(array $overrides = [], ?CarbonInterface $createdAt = null): Patient
    {
        $patient = Patient::create(array_merge([
            'medical_record_number' => 'RM-001',
            'nik' => null,
            'name' => 'Pasien Uji',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'phone' => '081234567890',
        ], $overrides));

        if ($createdAt !== null) {
            $patient->created_at = $createdAt;
            $patient->save();
        }

        return $patient;
    }
}
