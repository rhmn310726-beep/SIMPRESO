<?php

namespace App\Enums;

enum PrescriptionStatus: string
{
    case Menunggu = 'menunggu';
    case Diterima = 'diterima';
    case Disiapkan = 'disiapkan';
    case SiapDiambil = 'siap_diambil';
    case Diserahkan = 'diserahkan';
    case Dibatalkan = 'dibatalkan';

    public function label(): string
    {
        return match ($this) {
            self::Menunggu => 'Menunggu',
            self::Diterima => 'Diterima',
            self::Disiapkan => 'Disiapkan',
            self::SiapDiambil => 'Siap Diambil',
            self::Diserahkan => 'Diserahkan',
            self::Dibatalkan => 'Dibatalkan',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Diserahkan, self::Dibatalkan], true);
    }
}
