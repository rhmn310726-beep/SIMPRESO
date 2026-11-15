<?php

namespace App\Http\Controllers\Farmasi;

use App\Enums\PrescriptionStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\DrugInteraction;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $activeStatuses = [
            PrescriptionStatus::Menunggu,
            PrescriptionStatus::Diterima,
            PrescriptionStatus::Disiapkan,
            PrescriptionStatus::SiapDiambil,
        ];

        $search = trim((string) $request->query('search', ''));
        $doctorFilter = (string) $request->query('doctor_id', '');
        $doctorId = ctype_digit($doctorFilter) && (int) $doctorFilter > 0
            ? (int) $doctorFilter
            : null;

        $statusCounts = Prescription::query()
            ->whereIn('status', $activeStatuses)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $waiting = (int) ($statusCounts[PrescriptionStatus::Menunggu->value] ?? 0);
        $received = (int) ($statusCounts[PrescriptionStatus::Diterima->value] ?? 0);
        $preparing = (int) ($statusCounts[PrescriptionStatus::Disiapkan->value] ?? 0);
        $ready = (int) ($statusCounts[PrescriptionStatus::SiapDiambil->value] ?? 0);
        $today = today();

        $doctorOptions = User::query()
            ->where('role', Role::Dokter)
            ->whereHas('prescriptionsAsDoctor', fn (Builder $query) => $query->whereIn('status', $activeStatuses))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $doctor) => [
                'id' => $doctor->id,
                'name' => $doctor->name,
            ])
            ->values();

        $interactionRows = DrugInteraction::query()
            ->get(['medicine_a_id', 'medicine_b_id', 'severity', 'recommendation']);

        $queue = Prescription::query()
            ->whereIn('status', $activeStatuses)
            ->with([
                'patient:id,medical_record_number,name,date_of_birth,gender,phone',
                'patient.allergies:id,patient_id,allergen,note',
                'doctor:id,name',
                'items' => fn (HasMany $query) => $query->orderBy('id'),
                'items.medicine:id,name,active_ingredient,category,unit,strength',
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('number', 'like', "%{$search}%")
                        ->orWhereHas('patient', function (Builder $query) use ($search): void {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('medical_record_number', 'like', "%{$search}%");
                        })
                        ->orWhereHas('doctor', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($doctorId !== null, fn (Builder $query) => $query->where('doctor_id', $doctorId))
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (Prescription $prescription) use ($interactionRows): array {
                $itemMedicineIds = $prescription->items->pluck('medicine_id')->all();
                $selectedMedicineIds = array_flip($itemMedicineIds);
                $medicineNames = $prescription->items
                    ->mapWithKeys(fn ($item) => [$item->medicine_id => $item->medicine?->name ?? 'Obat'])
                    ->all();

                $interactions = $interactionRows
                    ->filter(fn (DrugInteraction $interaction) => isset(
                        $selectedMedicineIds[$interaction->medicine_a_id],
                        $selectedMedicineIds[$interaction->medicine_b_id],
                    ))
                    ->map(fn (DrugInteraction $interaction) => [
                        'medicine_a' => $medicineNames[$interaction->medicine_a_id] ?? 'Obat A',
                        'medicine_b' => $medicineNames[$interaction->medicine_b_id] ?? 'Obat B',
                        'severity' => $interaction->severity->value,
                        'severity_label' => $interaction->severity->label(),
                        'recommendation' => $interaction->recommendation,
                    ])
                    ->values();

                $allergies = $prescription->patient->allergies
                    ->sortBy('allergen')
                    ->map(fn ($allergy) => [
                        'allergen' => $allergy->allergen,
                        'note' => $allergy->note,
                    ])
                    ->values();

                $hasSevereInteraction = $interactions
                    ->contains(fn (array $interaction) => $interaction['severity'] === 'berat');

                return [
                    'id' => $prescription->id,
                    'number' => $prescription->number,
                    'status' => $prescription->status->value,
                    'status_label' => $prescription->status->label(),
                    'created_at_label' => $prescription->created_at?->locale('id')->translatedFormat('j M Y') ?? '-',
                    'created_at_time' => $prescription->created_at?->format('H:i').' WIB',
                    'notes' => $prescription->notes,
                    'patient' => [
                        'id' => $prescription->patient->id,
                        'medical_record_number' => $prescription->patient->medical_record_number,
                        'name' => $prescription->patient->name,
                        'age' => $prescription->patient->date_of_birth?->age ?? 0,
                        'gender_label' => $prescription->patient->gender->label(),
                        'phone' => $prescription->patient->phone,
                    ],
                    'doctor_name' => $prescription->doctor?->name ?? '-',
                    'items_count' => $prescription->items->count(),
                    'items' => $prescription->items->map(fn ($item) => [
                        'medicine_name' => $item->medicine?->name ?? 'Obat',
                        'dosage' => $item->dosage,
                        'quantity' => $item->quantity,
                        'instructions' => $item->instructions,
                        'unit' => $item->medicine?->unit,
                        'strength' => $item->medicine?->strength,
                    ])->values(),
                    'allergies' => $allergies,
                    'interactions' => $interactions,
                    'has_alerts' => $allergies->isNotEmpty() || $interactions->isNotEmpty(),
                    'alert_level' => $allergies->isNotEmpty() || $hasSevereInteraction
                        ? 'danger'
                        : ($interactions->isNotEmpty() ? 'warning' : 'safe'),
                ];
            })
            ->values();

        $lastUpdated = Prescription::query()
            ->whereIn('status', $activeStatuses)
            ->max('updated_at');

        return Inertia::render('farmasi/dashboard', [
            'today' => now()->locale('id')->translatedFormat('l, j F Y'),
            'stats' => [
                'waiting' => $waiting,
                'received' => $received,
                'preparing' => $preparing,
                'processing' => $received + $preparing,
                'ready' => $ready,
                'handed_over_today' => Prescription::query()
                    ->where('status', PrescriptionStatus::Diserahkan)
                    ->whereDate('handover_confirmed_at', $today)
                    ->count(),
                'active_total' => $waiting + $received + $preparing + $ready,
                'created_today' => Prescription::query()
                    ->whereDate('created_at', $today)
                    ->count(),
            ],
            'queue' => $queue,
            'doctor_options' => $doctorOptions,
            'filters' => [
                'search' => $search,
                'doctor_id' => $doctorId === null ? '' : (string) $doctorId,
            ],
            'last_updated_at' => $lastUpdated
                ? Carbon::parse($lastUpdated)->locale('id')->translatedFormat('j M Y, H:i').' WIB'
                : null,
        ]);
    }
}
