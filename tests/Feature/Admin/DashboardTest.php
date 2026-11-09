<?php

namespace Tests\Feature\Admin;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_dashboard(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin')->assertForbidden();
    }

    public function test_admin_dashboard_renders_live_metrics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'farmasi']);

        Medicine::create([
            'name' => 'Amoxicillin 500mg',
            'active_ingredient' => 'Amoxicillin',
            'unit' => 'Tablet',
            'stock' => 3,
            'minimum_stock' => 10,
            'status' => 'aktif',
        ]);

        Medicine::create([
            'name' => 'Paracetamol 500mg',
            'active_ingredient' => 'Paracetamol',
            'unit' => 'Tablet',
            'stock' => 120,
            'minimum_stock' => 20,
            'status' => 'aktif',
        ]);

        Medicine::create([
            'name' => 'Obat Nonaktif',
            'active_ingredient' => 'Lainnya',
            'unit' => 'Botol',
            'stock' => 0,
            'minimum_stock' => 5,
            'status' => 'nonaktif',
        ]);

        Patient::create([
            'medical_record_number' => 'RM-0001',
            'name' => 'Pasien Uji',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
        ]);

        $this->actingAs($admin)
            ->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->where('stats.active_medicines', 2)
                ->where('stats.inactive_medicines', 1)
                ->where('stats.critical_stock', 1)
                ->where('stats.out_of_stock', 0)
                ->where('stats.total_patients', 1)
                ->where('stats.patients_today', 1)
                ->where('stats.total_users', 2)
                ->has('low_stock', 1)
                ->where('low_stock.0.name', 'Amoxicillin 500mg')
                ->where('low_stock.0.subtitle', 'Amoxicillin • Tablet')
                ->where('low_stock.0.is_out', false)
                ->has('activities'));
    }

    public function test_admin_report_screen_is_accessible(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/admin/laporan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/laporan'));
    }
}
