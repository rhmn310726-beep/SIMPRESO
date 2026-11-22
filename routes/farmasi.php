<?php

use App\Http\Controllers\Farmasi\DashboardController;
use App\Http\Controllers\Farmasi\QueueController;
use App\Http\Controllers\Farmasi\ReportController;
use App\Http\Controllers\Farmasi\StockController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:farmasi'])
    ->prefix('farmasi')
    ->name('farmasi.')
    ->group(function () {
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('/antrean-resep', [QueueController::class, 'index'])->name('antrean-resep');
        Route::get('/antrean-resep/{prescription}', [QueueController::class, 'show'])->name('antrean-resep.show');
        Route::post('/antrean-resep/{prescription}/terima', [QueueController::class, 'accept'])->name('antrean-resep.accept');
        Route::post('/antrean-resep/{prescription}/siapkan', [QueueController::class, 'prepare'])->name('antrean-resep.prepare');
        Route::post('/antrean-resep/{prescription}/siap-diambil', [QueueController::class, 'markReady'])->name('antrean-resep.mark-ready');
        Route::post('/antrean-resep/{prescription}/batalkan', [QueueController::class, 'cancel'])->name('antrean-resep.cancel');
        Route::get('/antrean-resep/{prescription}/serah-terima', [QueueController::class, 'handoverForm'])->name('antrean-resep.handover.form');
        Route::post('/antrean-resep/{prescription}/serah-terima', [QueueController::class, 'handover'])->name('antrean-resep.handover');

        Route::get('/stok-obat', [StockController::class, 'index'])->name('stok.index');
        Route::post('/stok-obat', [StockController::class, 'store'])->name('stok.store');

        Route::get('/laporan', [ReportController::class, 'index'])->name('laporan.index');
        Route::get('/laporan/export', [ReportController::class, 'export'])->name('laporan.export');
    });
