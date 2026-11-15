<?php

namespace App\Services;

use App\Enums\PrescriptionStatus;
use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

class PrescriptionService
{
    /**
     * @param  array<int, array{medicine_id: int, dosage: string, quantity: int, instructions: string}>  $items
     */
    public function create(Patient $patient, int $doctorId, array $items, ?string $notes = null): Prescription
    {
        return DB::transaction(function () use ($patient, $doctorId, $items, $notes): Prescription {
            $prescription = Prescription::query()->create([
                'number' => $this->nextNumber(),
                'patient_id' => $patient->id,
                'doctor_id' => $doctorId,
                'status' => PrescriptionStatus::Menunggu,
                'notes' => $notes,
            ]);

            $prescription->items()->createMany($items);

            return $prescription;
        });
    }

    public function nextNumber(): string
    {
        $max = Prescription::query()
            ->pluck('number')
            ->map(fn (string $number) => (int) preg_replace('/\D/', '', $number))
            ->max() ?? 0;

        $next = $max + 1;

        do {
            $candidate = 'RX-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $exists = Prescription::query()->where('number', $candidate)->exists();
            $next++;
        } while ($exists);

        return $candidate;
    }
}
