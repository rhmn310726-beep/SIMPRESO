<?php

namespace App\Models;

use App\Enums\InteractionSeverity;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AllergyRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'active_ingredient',
        'drug_group',
        'allergen_name',
        'severity',
        'example_medicines',
    ];

    protected function casts(): array
    {
        return [
            'severity' => InteractionSeverity::class,
        ];
    }

    /**
     * @return Attribute<array<int, string>, string|array<int, string>|null>
     */
    protected function exampleMedicines(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value) => $value === null ? [] : (json_decode($value, true) ?? []),
            set: fn ($value) => json_encode(
                is_array($value)
                    ? array_values($value)
                    : collect(explode(',', (string) $value))
                        ->map(fn (string $item) => trim($item))
                        ->filter(fn (string $item) => $item !== '')
                        ->unique(fn (string $item) => mb_strtolower($item))
                        ->values()
                        ->all(),
                JSON_UNESCAPED_UNICODE,
            ),
        );
    }
}
