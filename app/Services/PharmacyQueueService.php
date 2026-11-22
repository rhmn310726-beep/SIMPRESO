<?php

namespace App\Services;

use App\Enums\PrescriptionStatus;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PharmacyQueueService
{
    public function __construct(private StockService $stockService) {}

    /**
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        'menunggu' => ['diterima', 'dibatalkan'],
        'diterima' => ['disiapkan', 'dibatalkan'],
        'disiapkan' => ['siap_diambil', 'dibatalkan'],
        'siap_diambil' => ['dibatalkan'],
    ];

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function accept(Prescription $prescription, User $pharmacist, array $attributes = []): Prescription
    {
        return $this->transition($prescription, $pharmacist, PrescriptionStatus::Diterima, $attributes);
    }

    public function prepare(Prescription $prescription, User $pharmacist): Prescription
    {
        return $this->transition($prescription, $pharmacist, PrescriptionStatus::Disiapkan);
    }

    public function markReady(Prescription $prescription, User $pharmacist): Prescription
    {
        return $this->transition($prescription, $pharmacist, PrescriptionStatus::SiapDiambil);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function cancel(Prescription $prescription, User $pharmacist, array $attributes = []): Prescription
    {
        return $this->transition($prescription, $pharmacist, PrescriptionStatus::Dibatalkan, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handover(Prescription $prescription, User $pharmacist, array $attributes): Prescription
    {
        return DB::transaction(function () use ($prescription, $pharmacist, $attributes): Prescription {
            /** @var Prescription $locked */
            $locked = Prescription::query()
                ->with(['items', 'items.medicine'])
                ->lockForUpdate()
                ->findOrFail($prescription->getKey());

            if ($locked->handover_confirmed_at !== null || $locked->status === PrescriptionStatus::Diserahkan) {
                throw ValidationException::withMessages([
                    'handover' => 'Resep ini sudah diserahkan dan tidak dapat diproses ulang.',
                ]);
            }

            if ($locked->status !== PrescriptionStatus::SiapDiambil) {
                throw ValidationException::withMessages([
                    'handover' => 'Serah terima hanya dapat dilakukan untuk resep berstatus Siap Diambil.',
                ]);
            }

            $this->stockService->dispenseForPrescription($locked, $locked->items, $pharmacist);

            $checklist = $locked->verification_checklist ?? [];
            if (! is_array($checklist)) {
                $checklist = [];
            }
            $checklist['handover_confirmed'] = true;

            $locked->forceFill([
                'status' => PrescriptionStatus::Diserahkan,
                'pharmacist_id' => $pharmacist->getKey(),
                'recipient_name' => $attributes['recipient_name'],
                'recipient_relationship' => $attributes['recipient_relationship'],
                'handover_confirmed_at' => now(),
                'notes' => $attributes['notes'] ?? $locked->notes,
                'verification_checklist' => $checklist,
            ])->save();

            return $locked->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function transition(Prescription $prescription, User $pharmacist, PrescriptionStatus $target, array $attributes = []): Prescription
    {
        return DB::transaction(function () use ($prescription, $pharmacist, $target, $attributes): Prescription {
            /** @var Prescription $locked */
            $locked = Prescription::query()
                ->lockForUpdate()
                ->findOrFail($prescription->getKey());

            if ($locked->status === PrescriptionStatus::Diserahkan) {
                throw ValidationException::withMessages([
                    'status' => 'Resep yang sudah diserahkan tidak dapat diubah.',
                ]);
            }

            if ($locked->status === $target) {
                return $locked;
            }

            $allowed = self::TRANSITIONS[$locked->status->value] ?? [];

            if (! in_array($target->value, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => 'Perubahan status dari '.$locked->status->label().' ke '.$target->label().' tidak diizinkan.',
                ]);
            }

            $data = [
                'status' => $target,
                'pharmacist_id' => $pharmacist->getKey(),
            ];

            if ($target === PrescriptionStatus::Diterima && array_key_exists('verification_checklist', $attributes)) {
                $data['verification_checklist'] = $attributes['verification_checklist'];
            }

            if ($target === PrescriptionStatus::Dibatalkan) {
                $data['notes'] = $attributes['notes'] ?? $locked->notes;
                $checklist = $locked->verification_checklist ?? [];
                if (! is_array($checklist)) {
                    $checklist = [];
                }
                if (array_key_exists('cancel_reason', $attributes)) {
                    $checklist['cancel_reason'] = $attributes['cancel_reason'];
                }
                $data['verification_checklist'] = $checklist;
            }

            $locked->fill($data)->save();

            return $locked->refresh();
        });
    }
}
