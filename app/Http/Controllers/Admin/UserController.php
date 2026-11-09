<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResetUserPasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role instanceof Role ? $user->role->value : $user->role,
            ]);

        return Inertia::render('admin/akun', [
            'users' => $users,
        ]);
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): RedirectResponse
    {
        DB::transaction(function () use ($request, $user): void {
            $user->forceFill([
                'password' => $request->string('password')->value(),
                'remember_token' => Str::random(60),
            ])->save();

            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->when(
                    $user->is($request->user()),
                    fn ($query) => $query->where('id', '!=', $request->session()->getId()),
                )
                ->delete();
        });

        return back()->with(
            'success',
            "Password untuk {$user->name} berhasil direset. Sampaikan password baru kepada user.",
        );
    }
}
