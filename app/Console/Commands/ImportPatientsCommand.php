<?php

namespace App\Console\Commands;

use App\Enums\Gender;
use App\Models\Patient;
use App\Support\CsvDatasetReader;
use DateTimeImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use RuntimeException;

class ImportPatientsCommand extends Command
{
    private const CHUNK_SIZE = 500;

    private const MAX_REPORTED_REJECTIONS = 50;

    /**
     * @var array<string, list<string>>
     */
    private const COLUMN_ALIASES = [
        'medical_record_number' => ['medical_record_number', 'no_rekam_medis', 'no_rm', 'nomor_rekam_medis', 'rm'],
        'nik' => ['nik', 'nik_ktp', 'no_ktp'],
        'name' => ['name', 'nama_lengkap', 'nama_pasien', 'nama'],
        'age' => ['age', 'usia'],
        'date_of_birth' => ['date_of_birth', 'tanggal_lahir', 'tgl_lahir'],
        'gender' => ['gender', 'jenis_kelamin'],
        'phone' => ['phone', 'no_telepon', 'no_telepon_whatsapp', 'telepon', 'no_hp'],
        'address' => ['address', 'alamat'],
        'allergies' => ['allergies', 'riwayat_alergi', 'riwayat_alergi_obat', 'alergi'],
    ];

    protected $signature = 'import:patients
                            {file : Path to the CSV file (relative paths resolve from the project root)}
                            {--dry-run : Validate and report without writing to the database}
                            {--delimiter= : Force the CSV delimiter instead of auto-detecting it}';

    protected $description = 'Import patient data (and recorded allergies) from a CSV file';

    public function handle(): int
    {
        try {
            $reader = CsvDatasetReader::open(
                $this->resolvePath((string) $this->argument('file')),
                $this->delimiterOption(),
            );

            $reader->requireAny(self::COLUMN_ALIASES, ['medical_record_number', 'name', 'gender']);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->line("File      : {$reader->path()}");
        $this->line('Delimiter : '.($reader->delimiter() === "\t" ? 'tab' : $reader->delimiter()));
        $this->newLine();

        $known = Patient::query()
            ->pluck('medical_record_number')
            ->mapWithKeys(fn (string $number): array => [mb_strtolower($number) => true])
            ->all();

        $pending = [];
        $total = 0;
        $created = 0;
        $skipped = 0;
        $rejected = [];

        foreach ($reader->rows() as $line => $row) {
            $total++;
            $mapped = $this->mapRow($row);

            if ($mapped['errors'] !== []) {
                $rejected[$line] = implode(' ', $mapped['errors']);

                continue;
            }

            $key = mb_strtolower($mapped['data']['medical_record_number']);

            if (isset($known[$key])) {
                $skipped++;

                continue;
            }

            $known[$key] = true;

            if ($dryRun) {
                $created++;

                continue;
            }

            $pending[] = $mapped;

            if (count($pending) >= self::CHUNK_SIZE) {
                $this->persist($pending);
                $created += count($pending);
                $pending = [];
            }
        }

        if ($pending !== []) {
            $this->persist($pending);
            $created += count($pending);
        }

        $this->report($total, $created, $skipped, $rejected, $dryRun);

        return self::SUCCESS;
    }

    /**
     * @param  list<array{data: array<string, mixed>, allergies: list<string>, errors: list<string>}>  $rows
     */
    private function persist(array $rows): void
    {
        DB::transaction(function () use ($rows): void {
            foreach ($rows as $row) {
                $patient = Patient::query()->create($row['data']);

                foreach ($row['allergies'] as $allergen) {
                    $patient->allergies()->create(['allergen' => $allergen]);
                }
            }
        });
    }

    /**
     * @param  array<string, string>  $row
     * @return array{data: array<string, mixed>, allergies: list<string>, errors: list<string>}
     */
    private function mapRow(array $row): array
    {
        $errors = [];

        $gender = $this->parseGender($this->value($row, 'gender'));

        if ($gender === null) {
            $errors[] = 'Jenis kelamin tidak dikenali (gunakan L/P, Laki-laki, atau Perempuan).';
        }

        $dateOfBirth = $this->resolveDateOfBirth(
            $this->value($row, 'date_of_birth'),
            $this->value($row, 'age'),
            $errors,
        );

        $allergies = $this->parseAllergies($this->value($row, 'allergies'));

        if ($errors !== []) {
            return ['data' => [], 'allergies' => $allergies, 'errors' => $errors];
        }

        $data = [
            'medical_record_number' => $this->value($row, 'medical_record_number'),
            'nik' => $this->nullable($this->value($row, 'nik')),
            'name' => $this->value($row, 'name'),
            'date_of_birth' => $dateOfBirth,
            'gender' => $gender,
            'phone' => $this->nullable($this->value($row, 'phone')),
            'address' => $this->nullable($this->value($row, 'address')),
        ];

        $validator = Validator::make($data, $this->rules(), $this->messages());

        if ($validator->fails()) {
            return [
                'data' => [],
                'allergies' => $allergies,
                'errors' => $validator->errors()->all(),
            ];
        }

        return [
            'data' => $validator->validated(),
            'allergies' => $allergies,
            'errors' => [],
        ];
    }

    /**
     * @param  array<string, string>  $row
     */
    private function value(array $row, string $key): string
    {
        foreach (self::COLUMN_ALIASES[$key] as $alias) {
            if (($row[$alias] ?? '') !== '') {
                return trim($row[$alias]);
            }
        }

        return '';
    }

    private function nullable(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    private function parseGender(string $value): ?string
    {
        $normalized = mb_strtolower(trim($value));

        return match (true) {
            in_array($normalized, ['l', 'lk', 'laki-laki', 'laki laki', 'pria', 'male'], true) => Gender::LakiLaki->value,
            in_array($normalized, ['p', 'pr', 'perempuan', 'wanita', 'female'], true) => Gender::Perempuan->value,
            default => null,
        };
    }

    /**
     * @param  list<string>  $errors
     */
    private function resolveDateOfBirth(string $dateOfBirth, string $age, array &$errors): ?string
    {
        if ($dateOfBirth !== '') {
            $parsed = $this->parseDate($dateOfBirth);

            if ($parsed === null) {
                $errors[] = "Tanggal lahir tidak valid: {$dateOfBirth}.";
            }

            return $parsed;
        }

        if ($age !== '') {
            if (preg_match('/^\d{1,3}$/', $age) !== 1) {
                $errors[] = "Usia tidak valid: {$age}.";

                return null;
            }

            return now()->subYears((int) $age)->toDateString();
        }

        $errors[] = 'Usia atau tanggal lahir wajib ada pada CSV.';

        return null;
    }

    private function parseDate(string $value): ?string
    {
        foreach (['d/m/Y', 'd-m-Y', 'Y-m-d', 'Y/m/d', 'j/n/Y'] as $format) {
            $date = DateTimeImmutable::createFromFormat('!'.$format, $value);
            $errors = DateTimeImmutable::getLastErrors();

            $isValid = $date !== false
                && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0));

            if ($isValid) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function parseAllergies(string $value): array
    {
        $ignored = ['tidak ada', 'tidak', 'none', 'nihil', '-'];

        $allergens = [];

        foreach (preg_split('/[,;]/', $value) ?: [] as $part) {
            $allergen = trim($part);

            if ($allergen === '' || in_array(mb_strtolower($allergen), $ignored, true)) {
                continue;
            }

            $allergens[mb_strtolower($allergen)] ??= $allergen;
        }

        return array_values($allergens);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'medical_record_number' => ['required', 'string', 'max:30'],
            'nik' => ['nullable', 'digits:16'],
            'name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', Rule::enum(Gender::class)],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'medical_record_number.required' => 'Nomor rekam medis wajib diisi.',
            'medical_record_number.max' => 'Nomor rekam medis maksimal 30 karakter.',
            'nik.digits' => 'NIK harus terdiri dari 16 digit angka.',
            'name.required' => 'Nama pasien wajib diisi.',
            'date_of_birth.required' => 'Tanggal lahir wajib diisi.',
            'date_of_birth.date' => 'Tanggal lahir tidak valid.',
            'gender.required' => 'Jenis kelamin wajib diisi.',
            'phone.max' => 'Nomor telepon maksimal 30 karakter.',
        ];
    }

    /**
     * @param  array<int, string>  $rejected
     */
    private function report(int $total, int $created, int $skipped, array $rejected, bool $dryRun): void
    {
        $this->table(['Keterangan', 'Jumlah'], [
            ['Total baris data', $total],
            [$dryRun ? 'Akan dibuat' : 'Dibuat', $created],
            ['Dilewati (duplikat)', $skipped],
            ['Ditolak (tidak valid)', count($rejected)],
        ]);

        if ($rejected !== []) {
            $this->newLine();
            $this->table(
                ['Baris', 'Alasan'],
                collect($rejected)
                    ->take(self::MAX_REPORTED_REJECTIONS)
                    ->map(fn (string $reason, int $line): array => [$line, $reason])
                    ->values()
                    ->all(),
            );

            if (count($rejected) > self::MAX_REPORTED_REJECTIONS) {
                $this->line('... dan '.(count($rejected) - self::MAX_REPORTED_REJECTIONS).' baris bermasalah lainnya.');
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->warn('Mode --dry-run aktif: tidak ada data yang ditulis ke database.');
        }
    }

    private function resolvePath(string $file): string
    {
        if ($file === '') {
            throw new RuntimeException('Path file CSV wajib diisi.');
        }

        if (is_file($file)) {
            return $file;
        }

        return base_path($file);
    }

    private function delimiterOption(): ?string
    {
        $delimiter = $this->option('delimiter');

        return is_string($delimiter) && $delimiter !== '' ? $delimiter : null;
    }
}
