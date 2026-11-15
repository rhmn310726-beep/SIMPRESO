<?php

namespace Tests\Feature\Console;

use App\Models\Patient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportPatientsCommandTest extends TestCase
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

    public function test_import_creates_patients_with_allergies_from_csv(): void
    {
        $file = $this->csv(
            "No. Rekam Medis,NIK (KTP),Nama Lengkap,Usia,Jenis Kelamin,No. Telepon (WhatsApp),Riwayat Alergi Obat\n"
            ."RM-001,,Ahmad Fauzi,34,Laki-laki,081234567890,Penisilin\n"
            ."RM-002,,Siti Rahmawati,28,Perempuan,081298765432,\"Sulfa, Kotrimoksazol\"\n"
            ."RM-003,,Budi Santoso,45,Laki-laki,082112223333,Tidak ada\n",
        );

        $this->artisan('import:patients', ['file' => $file])
            ->assertExitCode(0);

        $this->assertSame(3, Patient::query()->count());

        $ahmad = Patient::query()->where('medical_record_number', 'RM-001')->firstOrFail();

        $this->assertSame('Ahmad Fauzi', $ahmad->name);
        $this->assertSame('L', $ahmad->gender->value);
        $this->assertSame(now()->subYears(34)->toDateString(), $ahmad->date_of_birth->toDateString());
        $this->assertSame(['Penisilin'], $ahmad->allergies()->pluck('allergen')->all());

        $siti = Patient::query()->where('medical_record_number', 'RM-002')->firstOrFail();

        $this->assertSame('P', $siti->gender->value);
        $this->assertEqualsCanonicalizing(
            ['Sulfa', 'Kotrimoksazol'],
            $siti->allergies()->pluck('allergen')->all(),
        );

        $budi = Patient::query()->where('medical_record_number', 'RM-003')->firstOrFail();

        $this->assertSame(0, $budi->allergies()->count());
        $this->assertSame(now()->toDateString(), $budi->created_at->toDateString());
    }

    public function test_reimporting_the_same_file_skips_existing_medical_record_numbers(): void
    {
        $file = $this->csv(
            "No. Rekam Medis,Nama Lengkap,Usia,Jenis Kelamin,Riwayat Alergi Obat\n"
            ."RM-010,Rina Marlina,41,Perempuan,Parasetamol\n"
            ."RM-011,Fajar Hidayat,27,Laki-laki,Tidak ada\n",
        );

        $this->artisan('import:patients', ['file' => $file])->assertExitCode(0);

        $this->assertSame(2, Patient::query()->count());

        $this->artisan('import:patients', ['file' => $file])
            ->expectsOutputToContain('Dilewati (duplikat)')
            ->assertExitCode(0);

        $this->assertSame(2, Patient::query()->count());
        $this->assertSame(1, $this->allergyCount());
    }

    public function test_invalid_rows_are_rejected_while_valid_rows_are_imported(): void
    {
        $file = $this->csv(
            "No. Rekam Medis,Nama Lengkap,Usia,Jenis Kelamin\n"
            ."RM-020,Valid Patient,30,Laki-laki\n"
            ."RM-021,Bad Gender,30,Unknown\n"
            ."RM-022,Bad Age,tiga puluh,Perempuan\n",
        );

        $this->artisan('import:patients', ['file' => $file])
            ->expectsOutputToContain('Ditolak (tidak valid)')
            ->assertExitCode(0);

        $this->assertSame(1, Patient::query()->count());
        $this->assertDatabaseHas('patients', ['medical_record_number' => 'RM-020']);
        $this->assertDatabaseMissing('patients', ['medical_record_number' => 'RM-021']);
        $this->assertDatabaseMissing('patients', ['medical_record_number' => 'RM-022']);
    }

    public function test_dry_run_does_not_write_to_the_database(): void
    {
        $file = $this->csv(
            "No. Rekam Medis,Nama Lengkap,Usia,Jenis Kelamin\n"
            ."RM-030,Dry Run Patient,30,Laki-laki\n",
        );

        $this->artisan('import:patients', ['file' => $file, '--dry-run' => true])
            ->expectsOutputToContain('--dry-run')
            ->assertExitCode(0);

        $this->assertSame(0, Patient::query()->count());
        $this->assertSame(0, $this->allergyCount());
    }

    public function test_missing_file_fails(): void
    {
        $this->artisan('import:patients', ['file' => base_path('database/data/does-not-exist.csv')])
            ->assertExitCode(1);
    }

    public function test_missing_required_header_fails(): void
    {
        $file = $this->csv("Nama Lengkap,Usia\nTanpa RM,30\n");

        $this->artisan('import:patients', ['file' => $file])
            ->expectsOutputToContain('Kolom wajib tidak ditemukan')
            ->assertExitCode(1);

        $this->assertSame(0, Patient::query()->count());
    }

    private function csv(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'patients-');

        if ($path === false) {
            $this->fail('Unable to create a temporary CSV file.');
        }

        file_put_contents($path, "\xEF\xBB\xBF".$contents);

        $this->temporaryFiles[] = $path;

        return $path;
    }

    private function allergyCount(): int
    {
        return Patient::query()->withCount('allergies')->get()->sum('allergies_count');
    }
}
