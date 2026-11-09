<?php

namespace App\Models;

use App\Enums\MedicineStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'active_ingredient',
        'category',
        'unit',
        'strength',
        'stock',
        'minimum_stock',
        'storage_location',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'stock' => 'integer',
            'minimum_stock' => 'integer',
            'status' => MedicineStatus::class,
        ];
    }

    public function prescriptionItems(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(StockBatch::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', MedicineStatus::Aktif);
    }

    public function isLowStock(): bool
    {
        return $this->stock <= $this->minimum_stock;
    }
}
