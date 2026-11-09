<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class ForgotPasswordController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('auth/forgot-password');
    }

    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_THROTTLED) {
            return back()->with(
                'error',
                'Permintaan reset baru saja dikirim. Tunggu beberapa saat sebelum mencoba lagi.',
            );
        }

        return back()->with(
            'success',
            'Jika email tersebut terdaftar, tautan reset password telah dikirim. Periksa inbox atau folder spam Anda.',
        );
    }
}
