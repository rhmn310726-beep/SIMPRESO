<?php

namespace App\Enums;

enum Role: string
{
    case Dokter = 'dokter';
    case Farmasi = 'farmasi';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Dokter => 'Dokter',
            self::Farmasi => 'Farmasi',
            self::Admin => 'Admin',
        };
    }
}
