<?php

use App\Http\Controllers\Farmasi\DashboardController;
use App\Http\Controllers\Farmasi\QueueController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:farmasi'])
    ->prefix('farmasi')
    ->name('farmasi.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/antrean-resep', [QueueController::class, 'index'])->name('antrean-resep');
    });
