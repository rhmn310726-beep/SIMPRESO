<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'medicine_id',
        'batch_number',
        'location',
        'storage_location',
        'quantity',
        'initial_quantity',
        'unit_price',
        'expired_at',
        'received_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'initial_quantity' => 'integer',
            'unit_price' => 'integer',
            'expired_at' => 'date',
            'received_at' => 'date',
        ];
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    public function isExpired(): bool
    {
        return $this->expired_at !== null && $this->expired_at->lt(today());
    }

    public function isExpiringSoon(int $days = 90): bool
    {
        return $this->expired_at !== null && $this->expired_at->lte(today()->addDays($days));
    }

    public function totalValue(): int
    {
        return $this->quantity * $this->unit_price;
    }
}
