<?php

namespace App\Http\Controllers\Dokter;

use App\Enums\MedicineStatus;
use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dokter\StoreBulkPrescriptionRequest;
use App\Models\AllergyRule;
use App\Models\DrugInteraction;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Services\PrescriptionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PrescriptionController extends Controller
{
    public function __construct(private readonly PrescriptionService $prescriptions) {}

    public function create(Request $request): Response
    {
        $patientId = $request->integer('patient');
        $patient = $patientId > 0 ? Patient::query()->with('allergies')->find($patientId) : null;

        if ($patientId > 0 && $patient === null) {
            abort(404);
        }

        $search = trim((string) $request->query('search', ''));

        $patientOptions = Patient::query()
            ->withCount('allergies')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('medical_record_number', 'like', "%{$search}%")
                        ->orWhere('nik', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(8)
            ->withQueryString()
            ->through(fn (Patient $row) => [
                'id' => $row->id,
                'medical_record_number' => $row->medical_record_number,
                'name' => $row->name,
                'age' => $row->date_of_birth?->age ?? 0,
                'gender_label' => $row->gender->label(),
                'phone' => $row->phone,
                'allergies_count' => $row->allergies_count,
                'registered_at_label' => $row->created_at?->locale('id')->translatedFormat('j M Y'),
            ]);

        $medicines = Medicine::query()
            ->active()
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'active_ingredient',
                'category',
                'unit',
                'strength',
                'stock',
                'minimum_stock',
            ])
            ->map(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'name' => $medicine->name,
                'active_ingredient' => $medicine->active_ingredient,
                'category' => $medicine->category,
                'unit' => $medicine->unit,
                'strength' => $medicine->strength,
                'stock' => $medicine->stock,
                'minimum_stock' => $medicine->minimum_stock,
            ])
            ->values();

        $allergyRules = AllergyRule::query()
            ->orderBy('allergen_name')
            ->get()
            ->map(fn (AllergyRule $rule) => [
                'active_ingredient' => $rule->active_ingredient,
                'drug_group' => $rule->drug_group,
                'allergen_name' => $rule->allergen_name,
                'severity' => $rule->severity->value,
                'severity_label' => $rule->severity->label(),
                'example_medicines' => $rule->example_medicines,
            ])
            ->values();

        $interactions = DrugInteraction::query()
            ->orderBy('id')
            ->get(['medicine_a_id', 'medicine_b_id', 'severity', 'recommendation'])
            ->map(fn (DrugInteraction $interaction) => [
                'medicine_a_id' => $interaction->medicine_a_id,
                'medicine_b_id' => $interaction->medicine_b_id,
                'severity' => $interaction->severity->value,
                'severity_label' => $interaction->severity->label(),
                'recommendation' => $interaction->recommendation,
            ])
            ->values();

        return Inertia::render('dokter/buat-resep', [
            'patient' => $patient === null ? null : [
                'id' => $patient->id,
                'medical_record_number' => $patient->medical_record_number,
                'nik' => $patient->nik,
                'name' => $patient->name,
                'date_of_birth_label' => $patient->date_of_birth?->locale('id')->translatedFormat('j F Y'),
                'age' => $patient->date_of_birth?->age ?? 0,
                'gender_label' => $patient->gender->label(),
                'phone' => $patient->phone,
                'address' => $patient->address,
                'registered_at_label' => $patient->created_at?->locale('id')->translatedFormat('j F Y'),
                'allergies' => $patient->allergies
                    ->sortBy('allergen')
                    ->map(fn ($allergy) => [
                        'id' => $allergy->id,
                        'allergen' => $allergy->allergen,
                        'note' => $allergy->note,
                    ])
                    ->values(),
            ],
            'patient_options' => $patientOptions,
            'patients_count' => Patient::query()->count(),
            'medicines' => $medicines,
            'allergy_rules' => $allergyRules,
            'interactions' => $interactions,
            'filters' => [
                'search' => $search,
            ],
            'today' => now()->locale('id')->translatedFormat('j F Y'),
        ]);
    }

    public function store(StoreBulkPrescriptionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $patient = Patient::query()->findOrFail($data['patient_id']);

        $medicines = Medicine::query()
            ->whereIn('id', collect($data['items'])->pluck('medicine_id'))
            ->get()
            ->keyBy('id');

        $items = [];

        foreach ($data['items'] as $index => $item) {
            $medicine = $medicines->get((int) $item['medicine_id']);

            if (! $medicine instanceof Medicine) {
                throw ValidationException::withMessages([
                    "items.{$index}.medicine_id" => 'Obat yang dipilih tidak ditemukan.',
                ]);
            }

            if ($medicine->status !== MedicineStatus::Aktif) {
                throw ValidationException::withMessages([
                    "items.{$index}.medicine_id" => 'Obat ini tidak aktif di formularium.',
                ]);
            }

            $quantity = (int) $item['quantity'];

            if ($medicine->stock < $quantity) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => 'Stok obat tidak mencukupi. Tersedia '.$medicine->stock.' '.$medicine->unit.'.',
                ]);
            }

            $items[] = [
                'medicine_id' => $medicine->id,
                'dosage' => $item['dosage'],
                'quantity' => $quantity,
                'instructions' => $item['instructions'],
            ];
        }

        $prescription = $this->prescriptions->create(
            $patient,
            (int) $request->user()->id,
            $items,
            $data['notes'] ?? null,
        );

        return redirect()
            ->route('dokter.pasien.show', $patient)
            ->with('success', "Resep {$prescription->number} berhasil dikirim ke Instalasi Farmasi.");
    }

    public function history(Request $request): Response
    {
        $doctorId = (int) $request->user()->id;
        $filters = $this->historyFilters($request);

        $prescriptions = $this->historyQuery($doctorId, $filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Prescription $prescription) => $this->historyRow($prescription));

        return Inertia::render('dokter/riwayat-resep', [
            'prescriptions' => $prescriptions,
            'stats' => $this->historyStats($doctorId),
            'filters' => $filters,
            'status_options' => collect(PrescriptionStatus::cases())
                ->map(fn (PrescriptionStatus $status) => [
                    'value' => $status->value,
                    'label' => $status->label(),
                ])
                ->values(),
        ]);
    }

    public function exportHistory(Request $request): StreamedResponse
    {
        $doctorId = (int) $request->user()->id;
        $filters = $this->historyFilters($request);

        $prescriptions = $this->historyQuery($doctorId, $filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $filename = 'riwayat-resep-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($prescriptions): void {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            fwrite($output, "\xEF\xBB\xBF");

            fputcsv($output, [
                'No. Resep',
                'Tanggal',
                'Nama Pasien',
                'No. RM',
                'Jumlah Item',
                'Status',
                'Catatan',
            ], ',', '"', '');

            foreach ($prescriptions as $prescription) {
                fputcsv($output, [
                    $prescription->number,
                    $prescription->created_at?->format('Y-m-d H:i') ?? '',
                    $prescription->patient?->name ?? '',
                    $prescription->patient?->medical_record_number ?? '',
                    $prescription->items_count,
                    $prescription->status->label(),
                    $prescription->notes ?? '',
                ], ',', '"', '');
            }

            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{search: string, status: string, from: string|null, to: string|null}
     */
    private function historyFilters(Request $request): array
    {
        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));

        if ($status === 'all' || PrescriptionStatus::tryFrom($status) === null) {
            $status = '';
        }

        $from = $this->parseDateFilter($request->query('from'));
        $to = $this->parseDateFilter($request->query('to'));

        if ($from !== null && $to !== null && $from > $to) {
            [$from, $to] = [$to, $from];
        }

        return [
            'search' => $search,
            'status' => $status,
            'from' => $from,
            'to' => $to,
        ];
    }

    /**
     * @param  array{search: string, status: string, from: string|null, to: string|null}  $filters
     */
    private function historyQuery(int $doctorId, array $filters): Builder
    {
        return Prescription::query()
            ->where('doctor_id', $doctorId)
            ->with([
                'patient:id,medical_record_number,name,date_of_birth,gender,phone',
                'items' => fn (HasMany $query) => $query->orderBy('id'),
                'items.medicine:id,name,unit',
            ])
            ->withCount('items')
            ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function (Builder $query) use ($search): void {
                    $query->where('number', 'like', "%{$search}%")
                        ->orWhereHas('patient', function (Builder $query) use ($search): void {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('medical_record_number', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['status'] !== '', fn (Builder $query) => $query->where('status', $filters['status']))
            ->when($filters['from'] !== null, fn (Builder $query) => $query->whereDate('created_at', '>=', $filters['from']))
            ->when($filters['to'] !== null, fn (Builder $query) => $query->whereDate('created_at', '<=', $filters['to']));
    }

    /**
     * @return array{total: int, handed_over: int, in_progress: int, cancelled: int, handed_over_percent: float, period_label: string}
     */
    private function historyStats(int $doctorId): array
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();

        $base = fn (): Builder => Prescription::query()
            ->where('doctor_id', $doctorId)
            ->whereBetween('created_at', [$start, $end]);

        $total = $base()->count();
        $handedOver = $base()->where('status', PrescriptionStatus::Diserahkan)->count();
        $inProgress = $base()
            ->whereIn('status', [
                PrescriptionStatus::Menunggu,
                PrescriptionStatus::Diterima,
                PrescriptionStatus::Disiapkan,
                PrescriptionStatus::SiapDiambil,
            ])
            ->count();
        $cancelled = $base()->where('status', PrescriptionStatus::Dibatalkan)->count();

        return [
            'total' => $total,
            'handed_over' => $handedOver,
            'in_progress' => $inProgress,
            'cancelled' => $cancelled,
            'handed_over_percent' => $total > 0 ? round(($handedOver / $total) * 100, 1) : 0.0,
            'period_label' => now()->locale('id')->translatedFormat('F Y'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function historyRow(Prescription $prescription): array
    {
        $patient = $prescription->patient;

        return [
            'id' => $prescription->id,
            'number' => $prescription->number,
            'status' => $prescription->status->value,
            'status_label' => $prescription->status->label(),
            'created_at_label' => $prescription->created_at?->locale('id')->translatedFormat('j M Y'),
            'created_at_time' => $prescription->created_at === null
                ? null
                : $prescription->created_at->format('H:i').' WIB',
            'created_at_full' => $prescription->created_at === null
                ? null
                : $prescription->created_at->locale('id')->translatedFormat('j M Y, H:i').' WIB',
            'handover_at_label' => $prescription->handover_confirmed_at === null
                ? null
                : $prescription->handover_confirmed_at->locale('id')->translatedFormat('j M Y, H:i').' WIB',
            'notes' => $prescription->notes,
            'items_count' => $prescription->items_count,
            'patient' => $patient === null ? null : [
                'id' => $patient->id,
                'medical_record_number' => $patient->medical_record_number,
                'name' => $patient->name,
                'age' => $patient->date_of_birth?->age ?? 0,
                'gender' => $patient->gender->value,
                'gender_label' => $patient->gender->label(),
                'phone' => $patient->phone,
            ],
            'items' => $prescription->items
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'medicine_name' => $item->medicine?->name ?? 'Obat tidak tersedia',
                    'unit' => $item->medicine?->unit,
                    'dosage' => $item->dosage,
                    'quantity' => $item->quantity,
                    'instructions' => $item->instructions,
                ])
                ->values(),
        ];
    }

    private function parseDateFilter(mixed $value): ?string
    {
        if (! is_string($value) || ! Carbon::hasFormat($value, 'Y-m-d')) {
            return null;
        }

        return $value;
    }
}
