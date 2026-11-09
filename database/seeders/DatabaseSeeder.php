<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $accounts = [
            ['name' => 'Administrator SIMPRESO', 'email' => 'admin@simpreso.test', 'role' => Role::Admin],
            ['name' => 'Dokter SIMPRESO', 'email' => 'dokter@simpreso.test', 'role' => Role::Dokter],
            ['name' => 'Petugas Farmasi SIMPRESO', 'email' => 'farmasi@simpreso.test', 'role' => Role::Farmasi],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make('Simpreso123!'),
                    'role' => $account['role'],
                ],
            );
        }
    }
}
