<?php

namespace App\Console\Commands;

use App\Enums\MedicineStatus;
use App\Models\Medicine;
use App\Services\StockService;
use App\Support\CsvDatasetReader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use RuntimeException;

class ImportMedicinesCommand extends Command
{
    private const CHUNK_SIZE = 500;

    private const MAX_REPORTED_REJECTIONS = 50;

    /**
     * @var array<string, list<string>>
     */
    private const COLUMN_ALIASES = [
        'code' => ['code', 'kode', 'kode_obat'],
        'name' => ['name', 'nama_obat', 'nama'],
        'active_ingredient' => ['active_ingredient', 'bahan_aktif'],
        'category' => ['category', 'kategori', 'kategori_farmakologi'],
        'unit' => ['unit', 'bentuk_sediaan', 'satuan'],
        'strength' => ['strength', 'kekuatan', 'kekuatan_dosis'],
        'stock' => ['stock', 'stok', 'stok_awal', 'jumlah_stok'],
        'minimum_stock' => ['minimum_stock', 'stok_minimum', 'stok_minimum_buffer'],
        'storage_location' => ['storage_location', 'lokasi_rak_bin', 'lokasi_penyimpanan', 'lokasi'],
        'status' => ['status', 'status_ketersediaan'],
        'notes' => ['notes', 'catatan', 'catatan_peringatan_khusus'],
    ];

    protected $signature = 'import:medicines
                            {file : Path to the CSV file (relative paths resolve from the project root)}
                            {--dry-run : Validate and report without writing to the database}
                            {--delimiter= : Force the CSV delimiter instead of auto-detecting it}';

    protected $description = 'Import medicine master data from a CSV file and build the initial stock batch';

    public function handle(StockService $stock): int
    {
        try {
            $reader = CsvDatasetReader::open(
                $this->resolvePath((string) $this->argument('file')),
                $this->delimiterOption(),
            );

            $reader->requireAny(self::COLUMN_ALIASES, ['name', 'active_ingredient', 'category', 'unit', 'stock']);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->line("File      : {$reader->path()}");
        $this->line('Delimiter : '.($reader->delimiter() === "\t" ? 'tab' : $reader->delimiter()));
        $this->newLine();

        $usedCodes = Medicine::query()
            ->whereNotNull('code')
            ->pluck('code')
            ->mapWithKeys(fn (string $code): array => [mb_strtolower($code) => true])
            ->all();

        $pending = [];
        $total = 0;
        $created = 0;
        $skipped = 0;
        $rejected = [];
        $warnings = [];

        foreach ($reader->rows() as $line => $row) {
            $total++;

            $mapped = $this->mapRow($row, $usedCodes, $line, $warnings);

            if ($mapped['errors'] !== []) {
                $rejected[$line] = implode(' ', $mapped['errors']);

                continue;
            }

            $key = mb_strtolower($mapped['data']['code']);

            if (isset($usedCodes[$key])) {
                $skipped++;

                continue;
            }

            $usedCodes[$key] = true;

            if ($dryRun) {
                $created++;

                continue;
            }

            $pending[] = $mapped['data'];

            if (count($pending) >= self::CHUNK_SIZE) {
                $this->persist($pending, $stock);
                $created += count($pending);
                $pending = [];
            }
        }

        if ($pending !== []) {
            $this->persist($pending, $stock);
            $created += count($pending);
        }

        $this->report($total, $created, $skipped, $rejected, $warnings, $dryRun);

        return self::SUCCESS;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function persist(array $rows, StockService $stock): void
    {
        DB::transaction(function () use ($rows, $stock): void {
            foreach ($rows as $data) {
                $medicine = Medicine::query()->create($data);

                $stock->createInitialBatch($medicine);
            }
        });
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, bool>  $usedCodes
     * @param  array<int, string>  $warnings
     * @return array{data: array<string, mixed>, errors: list<string>}
     */
    private function mapRow(array $row, array &$usedCodes, int $line, array &$warnings): array
    {
        $code = $this->value($row, 'code');

        if ($code === '') {
            $code = $this->nextCode($usedCodes);
        }

        $status = $this->value($row, 'status');
        $mappedStatus = $this->parseStatus($status);

        if ($mappedStatus === null) {
            return [
                'data' => [],
                'errors' => ["Status ketersediaan tidak dikenali: {$status}."],
            ];
        }

        if ($status !== '' && in_array(mb_strtolower(trim($status)), ['ditangguhkan', 'suspend', 'suspended', 'ditarik'], true)) {
            $warnings[] = "Baris {$line}: status \"{$status}\" dipetakan menjadi nonaktif.";
        }

        $data = [
            'code' => $code,
            'name' => $this->value($row, 'name'),
            'active_ingredient' => $this->value($row, 'active_ingredient'),
            'category' => $this->value($row, 'category'),
            'unit' => $this->value($row, 'unit'),
            'strength' => $this->nullable($this->value($row, 'strength')),
            'stock' => $this->integer($this->value($row, 'stock')),
            'minimum_stock' => $this->integer($this->value($row, 'minimum_stock')),
            'storage_location' => $this->nullable($this->value($row, 'storage_location')),
            'notes' => $this->nullable($this->value($row, 'notes')),
            'status' => $mappedStatus->value,
        ];

        $validator = Validator::make($data, $this->rules(), $this->messages());

        if ($validator->fails()) {
            return ['data' => [], 'errors' => $validator->errors()->all()];
        }

        return ['data' => $validator->validated(), 'errors' => []];
    }

    private function integer(string $value): int|string
    {
        $value = trim($value);

        if ($value === '') {
            return 0;
        }

        if (preg_match('/^\d{1,9}$/', $value) !== 1) {
            return $value; // Keep the raw value so validation reports the row.
        }

        return (int) $value;
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

    private function parseStatus(string $value): ?MedicineStatus
    {
        $normalized = mb_strtolower(trim($value));

        return match (true) {
            $normalized === '', $normalized === 'aktif', $normalized === 'active', $normalized === 'tersedia' => MedicineStatus::Aktif,
            in_array($normalized, ['nonaktif', 'non aktif', 'tidak aktif', 'inactive'], true) => MedicineStatus::Nonaktif,
            in_array($normalized, ['ditangguhkan', 'suspend', 'suspended', 'ditarik'], true) => MedicineStatus::Nonaktif,
            default => null,
        };
    }

    /**
     * @param  array<string, bool>  $usedCodes
     */
    private function nextCode(array $usedCodes): string
    {
        $counter = 1;

        do {
            $code = 'OBT-'.str_pad((string) $counter, 3, '0', STR_PAD_LEFT);
            $counter++;
        } while (isset($usedCodes[mb_strtolower($code)]));

        return $code;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:30'],
            'name' => ['required', 'string', 'max:255'],
            'active_ingredient' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:50'],
            'strength' => ['nullable', 'string', 'max:100'],
            'stock' => ['required', 'integer', 'min:0'],
            'minimum_stock' => ['required', 'integer', 'min:0'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', Rule::enum(MedicineStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'code.required' => 'Kode obat wajib diisi.',
            'code.max' => 'Kode obat maksimal 30 karakter.',
            'name.required' => 'Nama obat wajib diisi.',
            'active_ingredient.required' => 'Bahan aktif wajib diisi untuk pengecekan alergi.',
            'category.required' => 'Kategori farmakologi wajib diisi.',
            'unit.required' => 'Bentuk sediaan wajib diisi.',
            'strength.max' => 'Kekuatan/dosis maksimal 100 karakter.',
            'stock.required' => 'Stok wajib diisi.',
            'stock.integer' => 'Stok harus berupa angka bulat.',
            'stock.min' => 'Stok tidak boleh negatif.',
            'minimum_stock.required' => 'Stok minimum wajib diisi.',
            'minimum_stock.integer' => 'Stok minimum harus berupa angka bulat.',
            'minimum_stock.min' => 'Stok minimum tidak boleh negatif.',
            'status.required' => 'Status ketersediaan wajib diisi.',
        ];
    }

    /**
     * @param  array<int, string>  $rejected
     * @param  list<string>  $warnings
     */
    private function report(int $total, int $created, int $skipped, array $rejected, array $warnings, bool $dryRun): void
    {
        $this->table(['Keterangan', 'Jumlah'], [
            ['Total baris data', $total],
            [$dryRun ? 'Akan dibuat' : 'Dibuat', $created],
            ['Dilewati (duplikat)', $skipped],
            ['Ditolak (tidak valid)', count($rejected)],
        ]);

        if ($warnings !== []) {
            $this->newLine();
            $this->warn('Peringatan pemetaan:');

            foreach ($warnings as $warning) {
                $this->line(" - {$warning}");
            }
        }

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
