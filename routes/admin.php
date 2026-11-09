<?php

use App\Http\Controllers\Admin\ClinicalRuleController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MedicineController;
use App\Http\Controllers\Admin\PatientController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\StockController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/akun', [UserController::class, 'index'])->name('akun.index');
        Route::post('/akun/{user}/reset-password', [UserController::class, 'resetPassword'])
            ->name('akun.reset-password');
        Route::get('/obat', [MedicineController::class, 'index'])->name('obat.index');
        Route::get('/obat/export', [MedicineController::class, 'export'])->name('obat.export');
        Route::post('/obat', [MedicineController::class, 'store'])->name('obat.store');
        Route::put('/obat/{medicine}', [MedicineController::class, 'update'])->name('obat.update');
        Route::delete('/obat/{medicine}', [MedicineController::class, 'destroy'])->name('obat.destroy');
        Route::get('/stok', [StockController::class, 'index'])->name('stok.index');
        Route::get('/stok/export', [StockController::class, 'export'])->name('stok.export');
        Route::post('/stok', [StockController::class, 'store'])->name('stok.store');
        Route::get('/pasien', [PatientController::class, 'index'])->name('pasien.index');
        Route::get('/pasien/export', [PatientController::class, 'export'])->name('pasien.export');
        Route::post('/pasien', [PatientController::class, 'store'])->name('pasien.store');
        Route::put('/pasien/{patient}', [PatientController::class, 'update'])->name('pasien.update');
        Route::delete('/pasien/{patient}', [PatientController::class, 'destroy'])->name('pasien.destroy');
        Route::get('/aturan', [ClinicalRuleController::class, 'index'])->name('aturan.index');
        Route::get('/aturan/export', [ClinicalRuleController::class, 'export'])->name('aturan.export');
        Route::post('/aturan/alergi', [ClinicalRuleController::class, 'storeAllergy'])
            ->name('aturan.allergy.store');
        Route::put('/aturan/alergi/{allergyRule}', [ClinicalRuleController::class, 'updateAllergy'])
            ->name('aturan.allergy.update');
        Route::delete('/aturan/alergi/{allergyRule}', [ClinicalRuleController::class, 'destroyAllergy'])
            ->name('aturan.allergy.destroy');
        Route::post('/aturan/interaksi', [ClinicalRuleController::class, 'storeInteraction'])
            ->name('aturan.interaction.store');
        Route::put('/aturan/interaksi/{interaction}', [ClinicalRuleController::class, 'updateInteraction'])
            ->name('aturan.interaction.update');
        Route::delete('/aturan/interaksi/{interaction}', [ClinicalRuleController::class, 'destroyInteraction'])
            ->name('aturan.interaction.destroy');
        Route::get('/laporan', [ReportController::class, 'index'])->name('laporan.index');
        Route::get('/laporan/export', [ReportController::class, 'export'])->name('laporan.export');
    });
