<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/akun')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_account_management(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/akun')->assertForbidden();
    }

    public function test_admin_can_view_account_list(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'dokter']);

        $this->actingAs($admin)
            ->get('/admin/akun')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/akun')
                ->has('users', 2)
                ->missing('users.0.password'));
    }

    public function test_admin_can_reset_user_password_and_terminate_sessions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create([
            'role' => 'dokter',
            'email' => 'dokter@simpreso.test',
        ]);
        $oldToken = $target->remember_token;

        DB::table('sessions')->insert([
            'id' => 'target-session',
            'user_id' => $target->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'payload',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.akun.index'))
            ->post(route('admin.akun.reset-password', $target), [
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordBaru123!',
            ])
            ->assertRedirect(route('admin.akun.index'))
            ->assertSessionHas('success');

        $target->refresh();

        $this->assertTrue(Hash::check('PasswordBaru123!', $target->password));
        $this->assertNotSame($oldToken, $target->remember_token);
        $this->assertDatabaseMissing('sessions', ['id' => 'target-session']);
    }

    public function test_password_confirmation_must_match(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($admin)
            ->post(route('admin.akun.reset-password', $target), [
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordLain123!',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_password_must_meet_minimum_length(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($admin)
            ->post(route('admin.akun.reset-password', $target), [
                'password' => 'pendek',
                'password_confirmation' => 'pendek',
            ])
            ->assertSessionHasErrors('password');
    }
}
