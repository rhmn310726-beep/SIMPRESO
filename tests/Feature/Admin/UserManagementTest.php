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

    public function test_guest_cannot_create_user(): void
    {
        $this->post(route('admin.akun.store'), [
            'name' => 'Staf Baru',
            'email' => 'staf@simpreso.test',
            'password' => 'PasswordBaru123!',
            'password_confirmation' => 'PasswordBaru123!',
            'role' => 'farmasi',
        ])->assertRedirect(route('login'));

        $this->assertDatabaseMissing('users', ['email' => 'staf@simpreso.test']);
    }

    public function test_non_admin_cannot_create_user(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)
            ->post(route('admin.akun.store'), [
                'name' => 'Staf Baru',
                'email' => 'staf@simpreso.test',
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordBaru123!',
                'role' => 'farmasi',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'staf@simpreso.test']);
    }

    public function test_admin_can_create_new_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->from(route('admin.akun.index'))
            ->post(route('admin.akun.store'), [
                'name' => 'apt. Rina Oktaviani, S.Farm',
                'email' => 'rina.farmasi@simpreso.test',
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordBaru123!',
                'role' => 'farmasi',
            ])
            ->assertRedirect(route('admin.akun.index'))
            ->assertSessionHas('success');

        $user = User::query()->where('email', 'rina.farmasi@simpreso.test')->first();

        $this->assertNotNull($user);
        $this->assertSame('apt. Rina Oktaviani, S.Farm', $user->name);
        $this->assertSame('farmasi', $user->role->value);
        $this->assertTrue(Hash::check('PasswordBaru123!', $user->password));
    }

    public function test_create_user_requires_unique_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $existing = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($admin)
            ->post(route('admin.akun.store'), [
                'name' => 'Duplikat Email',
                'email' => $existing->email,
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordBaru123!',
                'role' => 'dokter',
            ])
            ->assertSessionHasErrors('email');

        $this->assertSame(2, User::query()->count());
    }

    public function test_create_user_requires_valid_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.akun.store'), [
                'name' => 'Role Aneh',
                'email' => 'role-aneh@simpreso.test',
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordBaru123!',
                'role' => 'super_admin',
            ])
            ->assertSessionHasErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'role-aneh@simpreso.test']);
    }

    public function test_create_user_password_confirmation_must_match(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.akun.store'), [
                'name' => 'Staf Baru',
                'email' => 'staf@simpreso.test',
                'password' => 'PasswordBaru123!',
                'password_confirmation' => 'PasswordLain123!',
                'role' => 'farmasi',
            ])
            ->assertSessionHasErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'staf@simpreso.test']);
    }

    public function test_guest_cannot_update_user(): void
    {
        $target = User::factory()->create([
            'role' => 'dokter',
            'name' => 'Nama Lama',
        ]);

        $this->put(route('admin.akun.update', $target), [
            'name' => 'Nama Baru',
            'email' => 'baru@simpreso.test',
            'role' => 'farmasi',
        ])->assertRedirect(route('login'));

        $this->assertSame('Nama Lama', $target->fresh()->name);
    }

    public function test_non_admin_cannot_update_user(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);
        $target = User::factory()->create(['role' => 'farmasi']);

        $this->actingAs($dokter)
            ->put(route('admin.akun.update', $target), [
                'name' => 'Nama Baru',
                'email' => 'baru@simpreso.test',
                'role' => 'admin',
            ])
            ->assertForbidden();

        $this->assertSame('farmasi', $target->fresh()->role->value);
    }

    public function test_admin_can_update_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create([
            'role' => 'dokter',
            'name' => 'Nama Lama',
            'email' => 'lama@simpreso.test',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.akun.index'))
            ->put(route('admin.akun.update', $target), [
                'name' => 'dr. Sinta Maharani, Sp.PD',
                'email' => 'sinta.sp@simpreso.test',
                'role' => 'farmasi',
            ])
            ->assertRedirect(route('admin.akun.index'))
            ->assertSessionHas('success');

        $target->refresh();

        $this->assertSame('dr. Sinta Maharani, Sp.PD', $target->name);
        $this->assertSame('sinta.sp@simpreso.test', $target->email);
        $this->assertSame('farmasi', $target->role->value);
    }

    public function test_update_user_can_keep_own_email_but_not_duplicate(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create([
            'role' => 'dokter',
            'email' => 'target@simpreso.test',
        ]);
        $other = User::factory()->create(['role' => 'farmasi']);

        $this->actingAs($admin)
            ->put(route('admin.akun.update', $target), [
                'name' => 'Nama Diperbarui',
                'email' => 'target@simpreso.test',
                'role' => 'dokter',
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)
            ->put(route('admin.akun.update', $target), [
                'name' => 'Nama Diperbarui',
                'email' => $other->email,
                'role' => 'dokter',
            ])
            ->assertSessionHasErrors('email');

        $this->assertSame('target@simpreso.test', $target->fresh()->email);
    }

    public function test_update_user_requires_valid_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $target = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($admin)
            ->put(route('admin.akun.update', $target), [
                'name' => 'Nama Baru',
                'email' => 'baru@simpreso.test',
                'role' => 'super_admin',
            ])
            ->assertSessionHasErrors('role');
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
