<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_page_can_be_rendered(): void
    {
        $this->get('/forgot-password')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/forgot-password'));
    }

    public function test_reset_request_requires_a_valid_email(): void
    {
        $this->post('/forgot-password', ['email' => 'bukan-email'])
            ->assertSessionHasErrors('email');
    }

    public function test_reset_link_is_sent_to_registered_email(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'dokter@simpreso.test']);

        $this->from(route('password.request'))
            ->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect(route('password.request'))
            ->assertSessionHas('success');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_request_does_not_reveal_unknown_email(): void
    {
        Notification::fake();

        $this->from(route('password.request'))
            ->post('/forgot-password', ['email' => 'tidak-ada@simpreso.test'])
            ->assertRedirect(route('password.request'))
            ->assertSessionHas('success');

        Notification::assertNothingSent();
    }

    public function test_reset_password_page_can_be_rendered(): void
    {
        $user = User::factory()->create();
        $token = Password::createToken($user);

        $this->get('/reset-password/'.$token.'?email='.urlencode($user->email))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/reset-password')
                ->where('token', $token)
                ->where('email', $user->email));
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        $user = User::factory()->create(['email' => 'dokter@simpreso.test']);
        $token = Password::createToken($user);

        $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'PasswordBaru123!',
            'password_confirmation' => 'PasswordBaru123!',
        ])
            ->assertRedirect(route('login'))
            ->assertSessionHas('success');

        $this->assertTrue(Hash::check('PasswordBaru123!', $user->fresh()->password));
    }

    public function test_password_cannot_be_reset_with_an_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'dokter@simpreso.test']);

        $this->post('/reset-password', [
            'token' => 'token-palsu',
            'email' => $user->email,
            'password' => 'PasswordBaru123!',
            'password_confirmation' => 'PasswordBaru123!',
        ])
            ->assertSessionHasErrors('email');

        $this->assertFalse(Hash::check('PasswordBaru123!', $user->fresh()->password));
    }
}
