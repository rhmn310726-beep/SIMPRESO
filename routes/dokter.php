<?php

use App\Http\Controllers\Dokter\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:dokter'])
    ->prefix('dokter')
    ->name('dokter.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('daftar-pasien');
    });
