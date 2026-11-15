<?php

use App\Http\Controllers\Dokter\DashboardController;
use App\Http\Controllers\Dokter\PatientController;
use App\Http\Controllers\Dokter\PrescriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:dokter'])
    ->prefix('dokter')
    ->name('dokter.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('daftar-pasien');

        Route::get('/pasien', [PatientController::class, 'index'])->name('pasien.index');

        Route::get('/resep', [PrescriptionController::class, 'create'])->name('resep.create');
        Route::post('/resep', [PrescriptionController::class, 'store'])->name('resep.store');

        Route::get('/riwayat-resep', [PrescriptionController::class, 'history'])->name('riwayat-resep.index');
        Route::get('/riwayat-resep/export', [PrescriptionController::class, 'exportHistory'])
            ->name('riwayat-resep.export');

        Route::prefix('pasien/{patient}')
            ->name('pasien.')
            ->group(function () {
                Route::get('/', [PatientController::class, 'show'])->name('show');
                Route::put('/', [PatientController::class, 'update'])->name('update');
                Route::post('/alergi', [PatientController::class, 'storeAllergy'])->name('allergy.store');
                Route::delete('/alergi/{allergy}', [PatientController::class, 'destroyAllergy'])
                    ->name('allergy.destroy');
                Route::post('/resep', [PatientController::class, 'storePrescription'])->name('resep.store');
            });
    });
