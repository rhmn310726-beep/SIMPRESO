<?php

namespace Tests\Feature\Console;

use App\Enums\MedicineStatus;
use App\Models\Medicine;
use App\Models\StockBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportMedicinesCommandTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var list<string>
     */
    private array $temporaryFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }

        $this->temporaryFiles = [];

        parent::tearDown();
    }

    public function test_import_creates_medicines_with_initial_stock_batches(): void
    {
        $file = $this->csv(
            "Kode Obat,Nama Obat,Bahan Aktif,Kategori Farmakologi,Bentuk Sediaan,Kekuatan / Dosis,Stok Awal,Stok Minimum (Buffer),Lokasi Rak / Bin,Status Ketersediaan,Catatan / Peringatan Khusus\n"
            ."OBT-101,Paracetamol 500 mg,Paracetamol,Analgesik,Tablet,500 mg,250,30,Rak A-01,Aktif,Simpan pada suhu ruang.\n"
            ."OBT-102,Cendo Xitrol Tetes Mata,Polymyxin B,Antibiotik Oftalmik,Tetes mata,\"0,9%\",0,5,Lemari Khusus,Ditangguhkan,Jaga kebersihan ujung wadah.\n",
        );

        $this->artisan('import:medicines', ['file' => $file])
            ->expectsOutputToContain('dipetakan menjadi nonaktif')
            ->assertExitCode(0);

        $this->assertSame(2, Medicine::query()->count());

        $paracetamol = Medicine::query()->where('code', 'OBT-101')->firstOrFail();

        $this->assertSame('Paracetamol 500 mg', $paracetamol->name);
        $this->assertSame('Paracetamol', $paracetamol->active_ingredient);
        $this->assertSame(250, $paracetamol->stock);
        $this->assertSame(30, $paracetamol->minimum_stock);
        $this->assertSame(MedicineStatus::Aktif, $paracetamol->status);
        $this->assertSame(1, $paracetamol->batches()->count());

        $batch = $paracetamol->batches()->firstOrFail();

        $this->assertSame('BTH-INIT-'.str_pad((string) $paracetamol->getKey(), 4, '0', STR_PAD_LEFT), $batch->batch_number);
        $this->assertSame(250, $batch->quantity);
        $this->assertSame(250, $batch->initial_quantity);

        $cendo = Medicine::query()->where('code', 'OBT-102')->firstOrFail();

        $this->assertSame(MedicineStatus::Nonaktif, $cendo->status);
        $this->assertSame(0, $cendo->stock);
        $this->assertSame(0, StockBatch::query()->where('medicine_id', $cendo->id)->count());
    }

    public function test_reimporting_the_same_file_skips_existing_codes(): void
    {
        $file = $this->csv(
            "Kode Obat,Nama Obat,Bahan Aktif,Kategori Farmakologi,Bentuk Sediaan,Stok Awal,Stok Minimum,Status Ketersediaan\n"
            ."OBT-110,Amoksisilin 500 mg,Amoksisilin,Antibiotik,Kapsul,200,30,Aktif\n"
            ."OBT-111,Vitamin B Kompleks,Vitamin B kompleks,Vitamin,Tablet,130,20,Aktif\n",
        );

        $this->artisan('import:medicines', ['file' => $file])->assertExitCode(0);

        $this->assertSame(2, Medicine::query()->count());
        $this->assertSame(2, StockBatch::query()->count());

        $this->artisan('import:medicines', ['file' => $file])
            ->expectsOutputToContain('Dilewati (duplikat)')
            ->assertExitCode(0);

        $this->assertSame(2, Medicine::query()->count());
        $this->assertSame(2, StockBatch::query()->count());
    }

    public function test_invalid_rows_are_rejected_while_valid_rows_are_imported(): void
    {
        $file = $this->csv(
            "Kode Obat,Nama Obat,Bahan Aktif,Kategori Farmakologi,Bentuk Sediaan,Stok Awal,Stok Minimum,Status Ketersediaan\n"
            ."OBT-120,Obat Valid,Paracetamol,Analgesik,Tablet,10,2,Aktif\n"
            ."OBT-121,Stok Tidak Angka,Paracetamol,Analgesik,Tablet,abc,2,Aktif\n"
            ."OBT-122,Stok Negatif,Paracetamol,Analgesik,Tablet,-5,2,Aktif\n"
            ."OBT-123,Status Salah,Paracetamol,Analgesik,Tablet,10,2,Ditangguhkan\n",
        );

        $this->artisan('import:medicines', ['file' => $file])
            ->expectsOutputToContain('Ditolak (tidak valid)')
            ->assertExitCode(0);

        // The suspended status is mapped to nonaktif, so OBT-123 is still imported.
        $this->assertSame(2, Medicine::query()->count());
        $this->assertDatabaseHas('medicines', ['code' => 'OBT-120']);
        $this->assertDatabaseMissing('medicines', ['code' => 'OBT-121']);
        $this->assertDatabaseMissing('medicines', ['code' => 'OBT-122']);
        $this->assertDatabaseHas('medicines', ['code' => 'OBT-123', 'status' => 'nonaktif']);
    }

    public function test_dry_run_does_not_write_to_the_database(): void
    {
        $file = $this->csv(
            "Kode Obat,Nama Obat,Bahan Aktif,Kategori Farmakologi,Bentuk Sediaan,Stok Awal,Stok Minimum,Status Ketersediaan\n"
            ."OBT-130,Obat Dry Run,Paracetamol,Analgesik,Tablet,50,5,Aktif\n",
        );

        $this->artisan('import:medicines', ['file' => $file, '--dry-run' => true])
            ->expectsOutputToContain('--dry-run')
            ->assertExitCode(0);

        $this->assertSame(0, Medicine::query()->count());
        $this->assertSame(0, StockBatch::query()->count());
    }

    public function test_missing_file_fails(): void
    {
        $this->artisan('import:medicines', ['file' => base_path('database/data/does-not-exist.csv')])
            ->assertExitCode(1);
    }

    public function test_missing_required_header_fails(): void
    {
        $file = $this->csv("Nama Obat,Stok Awal\nTanpa Bahan Aktif,10\n");

        $this->artisan('import:medicines', ['file' => $file])
            ->expectsOutputToContain('Kolom wajib tidak ditemukan')
            ->assertExitCode(1);

        $this->assertSame(0, Medicine::query()->count());
    }

    private function csv(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'medicines-');

        if ($path === false) {
            $this->fail('Unable to create a temporary CSV file.');
        }

        file_put_contents($path, "\xEF\xBB\xBF".$contents);

        $this->temporaryFiles[] = $path;

        return $path;
    }
}
