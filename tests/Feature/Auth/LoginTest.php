<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_can_be_rendered(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/login'));
    }

    public function test_users_are_redirected_to_their_role_dashboard(): void
    {
        $destinations = [
            Role::Dokter->value => 'dokter.daftar-pasien',
            Role::Farmasi->value => 'farmasi.antrean-resep',
            Role::Admin->value => 'admin.dashboard',
        ];

        foreach ($destinations as $role => $routeName) {
            $user = User::factory()->create([
                'email' => "{$role}@simpreso.test",
                'role' => $role,
            ]);

            $this->post('/login', [
                'email' => $user->email,
                'password' => 'password',
            ])->assertRedirect(route($routeName));

            $this->assertAuthenticatedAs($user);

            $this->post('/logout')->assertRedirect(route('login'));
            $this->assertGuest();
        }
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $user = User::factory()->create(['role' => Role::Dokter]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password-salah',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_public_registration_route_does_not_exist(): void
    {
        $this->get('/register')->assertNotFound();
    }
}
