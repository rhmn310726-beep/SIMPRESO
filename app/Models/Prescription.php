<?php

namespace App\Models;

use App\Enums\PrescriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prescription extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'patient_id',
        'doctor_id',
        'pharmacist_id',
        'status',
        'notes',
        'verification_checklist',
        'recipient_name',
        'recipient_relationship',
        'handover_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PrescriptionStatus::class,
            'verification_checklist' => 'array',
            'handover_confirmed_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function pharmacist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacist_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isHandedOver(): bool
    {
        return $this->handover_confirmed_at !== null;
    }
}
