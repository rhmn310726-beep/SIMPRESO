<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Models\Medicine;
use App\Models\StockBatch;
use App\Models\User;
use Illuminate\Support\Str;

class StockService
{
    public const DEFAULT_LOCATION = 'Gudang Utama Farmasi';

    /**
     * Create the first batch for a medicine that is being added to the formularium.
     * The medicine's stock is already set, so no increment or movement is recorded.
     */
    public function createInitialBatch(Medicine $medicine): ?StockBatch
    {
        if ($medicine->stock <= 0) {
            return null;
        }

        return $medicine->batches()->create([
            'batch_number' => 'BTH-INIT-'.str_pad((string) $medicine->getKey(), 4, '0', STR_PAD_LEFT),
            'location' => self::DEFAULT_LOCATION,
            'storage_location' => $medicine->storage_location,
            'quantity' => $medicine->stock,
            'initial_quantity' => $medicine->stock,
            'unit_price' => 0,
            'expired_at' => null,
            'received_at' => today(),
            'note' => 'Stok awal formularium',
        ]);
    }

    /**
     * Add a new batch, increment the medicine stock, and record an incoming movement.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function addBatch(Medicine $medicine, array $attributes, ?User $user): StockBatch
    {
        $quantity = (int) $attributes['quantity'];

        $batch = $medicine->batches()->create([
            'batch_number' => $attributes['batch_number'],
            'location' => $attributes['location'],
            'storage_location' => $attributes['storage_location'] ?? null,
            'quantity' => $quantity,
            'initial_quantity' => $quantity,
            'unit_price' => (int) $attributes['unit_price'],
            'expired_at' => $attributes['expired_at'] ?? null,
            'received_at' => $attributes['received_at'] ?? today(),
            'note' => $attributes['note'] ?? null,
        ]);

        $medicine->increment('stock', $quantity);

        $medicine->stockMovements()->create([
            'type' => StockMovementType::Masuk,
            'quantity' => $quantity,
            'user_id' => $user?->getKey(),
            'note' => $attributes['note'] ?? 'Penerimaan stok batch '.$attributes['batch_number'],
        ]);

        return $batch;
    }

    /**
     * Keep batch quantities aligned when stock is edited from the medicine form.
     * Positive deltas create an adjustment batch; negative deltas consume FEFO batches.
     */
    public function syncBatches(Medicine $medicine, int $previousStock, int $newStock): void
    {
        $delta = $newStock - $previousStock;

        if ($delta === 0) {
            return;
        }

        if ($delta > 0) {
            $medicine->batches()->create([
                'batch_number' => 'BTH-ADJ-'.str_pad((string) $medicine->getKey(), 4, '0', STR_PAD_LEFT).'-'.now()->format('YmdHisu').'-'.Str::upper(Str::random(3)),
                'location' => self::DEFAULT_LOCATION,
                'storage_location' => $medicine->storage_location,
                'quantity' => $delta,
                'initial_quantity' => $delta,
                'unit_price' => 0,
                'expired_at' => null,
                'received_at' => today(),
                'note' => 'Penyesuaian stok dari Data Obat',
            ]);

            return;
        }

        $remaining = abs($delta);

        $batches = $medicine->batches()
            ->where('quantity', '>', 0)
            ->orderByRaw('expired_at IS NULL')
            ->orderBy('expired_at')
            ->orderBy('id')
            ->get();

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            $deduct = min($batch->quantity, $remaining);
            $batch->decrement('quantity', $deduct);
            $remaining -= $deduct;
        }
    }
}
