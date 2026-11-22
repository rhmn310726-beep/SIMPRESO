<?php

namespace App\Support;

use Generator;
use RuntimeException;

class CsvDatasetReader
{
    private const DELIMITER_CANDIDATES = [',', ';', "\t"];

    /**
     * @var array<string, string> Normalized key => original header.
     */
    private array $headerMap = [];

    /**
     * @var array<int, string> Column index => normalized key.
     */
    private array $columnKeys = [];

    private string $delimiter = ',';

    /**
     * @param  resource  $handle
     */
    private function __construct(
        private $handle,
        private readonly string $path,
        private readonly ?string $forcedDelimiter,
    ) {}

    public static function open(string $path, ?string $delimiter = null): self
    {
        if (! is_file($path)) {
            throw new RuntimeException("File CSV tidak ditemukan: {$path}");
        }

        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw new RuntimeException("File CSV tidak dapat dibuka: {$path}");
        }

        $reader = new self($handle, $path, $delimiter);
        $reader->readHeader();

        return $reader;
    }

    public function __destruct()
    {
        if (is_resource($this->handle)) {
            fclose($this->handle);
        }
    }

    public function path(): string
    {
        return $this->path;
    }

    public function delimiter(): string
    {
        return $this->delimiter;
    }

    /**
     * @return array<string, string>
     */
    public function headers(): array
    {
        return $this->headerMap;
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->headerMap);
    }

    /**
     * @param  array<string, list<string>>  $columns  Canonical key => accepted normalized header keys.
     * @param  list<string>  $required
     * @return array<string, string> Canonical key => matched header key.
     */
    public function requireAny(array $columns, array $required): array
    {
        $resolved = [];
        $missing = [];

        foreach ($columns as $canonical => $keys) {
            $match = null;

            foreach ($keys as $key) {
                if ($this->has($key)) {
                    $match = $key;

                    break;
                }
            }

            if ($match !== null) {
                $resolved[$canonical] = $match;

                continue;
            }

            if (in_array($canonical, $required, true)) {
                $missing[] = $canonical;
            }
        }

        if ($missing !== []) {
            throw new RuntimeException(
                'Kolom wajib tidak ditemukan pada CSV: '.implode(', ', $missing)
                .'. Header yang terbaca: '.implode(', ', array_keys($this->headerMap)).'.',
            );
        }

        return $resolved;
    }

    /**
     * @return Generator<int, array<string, string>> Row number => normalized row.
     */
    public function rows(): Generator
    {
        $line = 1;

        while (($cells = fgetcsv($this->handle, 0, $this->delimiter, '"', '')) !== false) {
            $line++;

            if ($cells === [null]) {
                continue;
            }

            $row = [];

            foreach ($this->columnKeys as $index => $key) {
                $row[$key] = trim(self::clean((string) ($cells[$index] ?? '')));
            }

            if ($row === [] || array_filter($row, fn (string $value): bool => $value !== '') === []) {
                continue;
            }

            yield $line => $row;
        }
    }

    private function readHeader(): void
    {
        $line = fgets($this->handle);

        if ($line === false) {
            throw new RuntimeException("File CSV kosong: {$this->path}");
        }

        $line = self::clean($line);
        $this->delimiter = $this->forcedDelimiter ?? self::detectDelimiter($line);

        foreach (str_getcsv($line, $this->delimiter, '"', '') as $index => $header) {
            $key = self::normalizeKey((string) $header);

            if ($key === '') {
                continue;
            }

            $this->headerMap[$key] = trim((string) $header);
            $this->columnKeys[$index] = $key;
        }

        if ($this->headerMap === []) {
            throw new RuntimeException("Header CSV tidak dikenali: {$this->path}");
        }
    }

    private static function detectDelimiter(string $line): string
    {
        $best = ',';
        $bestColumns = 0;

        foreach (self::DELIMITER_CANDIDATES as $candidate) {
            $columns = count(str_getcsv($line, $candidate, '"', ''));

            if ($columns > $bestColumns) {
                $best = $candidate;
                $bestColumns = $columns;
            }
        }

        return $best;
    }

    private static function normalizeKey(string $header): string
    {
        $key = preg_replace('/[^a-z0-9]+/', '_', mb_strtolower(trim($header))) ?? '';

        return trim($key, '_');
    }

    private static function clean(string $value): string
    {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;

        if (! mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
        }

        return $value;
    }
}
