<?php

namespace App\Enums;

enum InteractionSeverity: string
{
    case Ringan = 'ringan';
    case Sedang = 'sedang';
    case Berat = 'berat';

    public function label(): string
    {
        return match ($this) {
            self::Ringan => 'Ringan',
            self::Sedang => 'Sedang',
            self::Berat => 'Berat',
        };
    }
}
