<?php

namespace App\Http\Controllers\Farmasi;

use App\Enums\PrescriptionStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Farmasi\AcceptPrescriptionRequest;
use App\Http\Requests\Farmasi\CancelPrescriptionRequest;
use App\Http\Requests\Farmasi\HandoverPrescriptionRequest;
use App\Models\DrugInteraction;
use App\Models\Prescription;
use App\Models\User;
use App\Services\PharmacyQueueService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function __construct(private PharmacyQueueService $service) {}

    public function index(Request $request): Response
    {
        $activeStatuses = [
            PrescriptionStatus::Menunggu,
            PrescriptionStatus::Diterima,
            PrescriptionStatus::Disiapkan,
            PrescriptionStatus::SiapDiambil,
        ];

        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', '');
        $doctorFilter = (string) $request->query('doctor_id', '');
        $doctorId = ctype_digit($doctorFilter) && (int) $doctorFilter > 0 ? (int) $doctorFilter : null;

        $statusCounts = Prescription::query()
            ->whereIn('status', $activeStatuses)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $doctorOptions = User::query()
            ->where('role', Role::Dokter)
            ->whereHas('prescriptionsAsDoctor', fn (Builder $query) => $query->whereIn('status', $activeStatuses))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $doctor) => ['id' => $doctor->id, 'name' => $doctor->name])
            ->values();

        $query = Prescription::query()
            ->whereIn('status', $activeStatuses)
            ->with([
                'patient:id,medical_record_number,name,date_of_birth,gender,phone',
                'patient.allergies:id,patient_id,allergen',
                'doctor:id,name',
                'items' => fn (HasMany $q) => $q->orderBy('id'),
                'items.medicine:id,name',
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->whereLike('number', "%{$search}%")
                        ->orWhereHas('patient', function (Builder $query) use ($search): void {
                            $query->whereLike('name', "%{$search}%")
                                ->orWhereLike('medical_record_number', "%{$search}%");
                        })
                        ->orWhereHas('doctor', fn (Builder $query) => $query->whereLike('name', "%{$search}%"));
                });
            })
            ->when($doctorId !== null, fn (Builder $query) => $query->where('doctor_id', $doctorId))
            ->when(in_array($status, array_map(fn ($s) => $s->value, $activeStatuses), true), fn (Builder $query) => $query->where('status', $status))
            ->orderByRaw("CASE status WHEN 'menunggu' THEN 0 WHEN 'diterima' THEN 1 WHEN 'disiapkan' THEN 2 WHEN 'siap_diambil' THEN 3 ELSE 4 END")
            ->orderBy('created_at')
            ->orderBy('id');

        $interactionRows = DrugInteraction::query()->get(['medicine_a_id', 'medicine_b_id', 'severity', 'recommendation']);

        $prescriptions = $query->paginate(15)->withQueryString();

        $prescriptions->through(function (Prescription $prescription) use ($interactionRows): array {
            $itemMedicineIds = array_flip($prescription->items->pluck('medicine_id')->all());
            $medicineNames = $prescription->items->mapWithKeys(fn ($item) => [$item->medicine_id => $item->medicine?->name ?? 'Obat'])->all();

            $interactionCount = $interactionRows->filter(fn (DrugInteraction $i) => isset($itemMedicineIds[$i->medicine_a_id], $itemMedicineIds[$i->medicine_b_id]))->count();
            $allergyCount = $prescription->patient->allergies->count();

            return [
                'id' => $prescription->id,
                'number' => $prescription->number,
                'status' => $prescription->status->value,
                'status_label' => $prescription->status->label(),
                'created_at_label' => $prescription->created_at?->locale('id')->translatedFormat('j M Y, H:i').' WIB',
                'patient' => [
                    'id' => $prescription->patient->id,
                    'medical_record_number' => $prescription->patient->medical_record_number,
                    'name' => $prescription->patient->name,
                    'age' => $prescription->patient->date_of_birth?->age ?? 0,
                    'gender_label' => $prescription->patient->gender->label(),
                ],
                'doctor_name' => $prescription->doctor?->name ?? '-',
                'items_count' => $prescription->items->count(),
                'has_alerts' => $allergyCount > 0 || $interactionCount > 0,
                'allergy_count' => $allergyCount,
                'interaction_count' => $interactionCount,
                'next_action' => $this->nextAction($prescription),
            ];
        });

        return Inertia::render('farmasi/antrean-resep', [
            'prescriptions' => $prescriptions,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'doctor_id' => $doctorId === null ? '' : (string) $doctorId,
            ],
            'counts' => [
                'menunggu' => (int) ($statusCounts[PrescriptionStatus::Menunggu->value] ?? 0),
                'diterima' => (int) ($statusCounts[PrescriptionStatus::Diterima->value] ?? 0),
                'disiapkan' => (int) ($statusCounts[PrescriptionStatus::Disiapkan->value] ?? 0),
                'siap_diambil' => (int) ($statusCounts[PrescriptionStatus::SiapDiambil->value] ?? 0),
            ],
            'doctor_options' => $doctorOptions,
        ]);
    }

    public function show(Prescription $prescription): Response|RedirectResponse
    {
        if ($prescription->status === PrescriptionStatus::Diserahkan) {
            return redirect()->route('farmasi.antrean-resep')->with('success', 'Resep '.$prescription->number.' sudah diserahkan.');
        }

        if ($prescription->status === PrescriptionStatus::Dibatalkan) {
            return redirect()->route('farmasi.antrean-resep')->with('success', 'Resep '.$prescription->number.' telah dibatalkan.');
        }

        return Inertia::render('farmasi/detail-resep', $this->detailProps($prescription->fresh()));
    }

    public function handoverForm(Prescription $prescription): Response|RedirectResponse
    {
        $prescription->refresh();

        if ($prescription->handover_confirmed_at !== null || $prescription->status === PrescriptionStatus::Diserahkan) {
            return redirect()->route('farmasi.antrean-resep')->with('success', 'Resep '.$prescription->number.' sudah diserahkan.');
        }

        if ($prescription->status !== PrescriptionStatus::SiapDiambil) {
            return redirect()->route('farmasi.antrean-resep.show', $prescription)
                ->with('error', 'Serah terima hanya dapat dilakukan untuk resep berstatus Siap Diambil.');
        }

        return Inertia::render('farmasi/serah-terima', $this->detailProps($prescription));
    }

    public function accept(AcceptPrescriptionRequest $request, Prescription $prescription): RedirectResponse
    {
        try {
            $checklist = $request->validated('checklist');
            $this->service->accept($prescription, $request->user(), [
                'verification_checklist' => [
                    'patient_identity' => (bool) ($checklist['patient_identity'] ?? false),
                    'medicine_match' => (bool) ($checklist['medicine_match'] ?? false),
                    'dose_instruction' => (bool) ($checklist['dose_instruction'] ?? false),
                    'allergy_interaction' => (bool) ($checklist['allergy_interaction'] ?? false),
                    'availability_condition' => (bool) ($checklist['availability_condition'] ?? false),
                    'verified_at' => now()->toIso8601String(),
                    'verified_by' => $request->user()->id,
                ],
            ]);

            return redirect()->route('farmasi.antrean-resep.show', $prescription)
                ->with('success', 'Resep '.$prescription->number.' diterima dan verifikasi tersimpan.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }
    }

    public function prepare(Request $request, Prescription $prescription): RedirectResponse
    {
        try {
            $this->service->prepare($prescription, $request->user());

            return redirect()->route('farmasi.antrean-resep.show', $prescription)
                ->with('success', 'Resep '.$prescription->number.' ditandai sedang/selesai disiapkan.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }
    }

    public function markReady(Request $request, Prescription $prescription): RedirectResponse
    {
        try {
            $this->service->markReady($prescription, $request->user());

            return redirect()->route('farmasi.antrean-resep.show', $prescription)
                ->with('success', 'Resep '.$prescription->number.' ditandai siap diambil.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }
    }

    public function cancel(CancelPrescriptionRequest $request, Prescription $prescription): RedirectResponse
    {
        try {
            $reason = $request->validated('reason');
            $this->service->cancel($prescription, $request->user(), [
                'notes' => $reason,
                'cancel_reason' => $reason,
            ]);

            return redirect()->route('farmasi.antrean-resep')
                ->with('success', 'Resep '.$prescription->number.' dibatalkan.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }
    }

    public function handover(HandoverPrescriptionRequest $request, Prescription $prescription): RedirectResponse
    {
        try {
            $this->service->handover($prescription, $request->user(), [
                'recipient_name' => $request->validated('recipient_name'),
                'recipient_relationship' => $request->validated('recipient_relationship'),
                'notes' => $request->validated('notes'),
            ]);

            return redirect()->route('farmasi.antrean-resep')
                ->with('success', 'Serah terima resep '.$prescription->number.' berhasil dikonfirmasi.');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function detailProps(Prescription $prescription): array
    {
        $prescription->loadMissing([
            'patient:id,medical_record_number,nik,name,date_of_birth,gender,phone,address',
            'patient.allergies:id,patient_id,allergen,note',
            'doctor:id,name',
            'pharmacist:id,name',
            'items' => fn (HasMany $q) => $q->orderBy('id'),
            'items.medicine:id,name,active_ingredient,category,unit,strength,stock,minimum_stock,status',
        ]);

        $interactionRows = DrugInteraction::query()->get(['medicine_a_id', 'medicine_b_id', 'severity', 'recommendation']);
        $itemMedicineIds = array_flip($prescription->items->pluck('medicine_id')->all());
        $medicineNames = $prescription->items->mapWithKeys(fn ($item) => [$item->medicine_id => $item->medicine?->name ?? 'Obat'])->all();

        $interactions = $interactionRows
            ->filter(fn (DrugInteraction $interaction) => isset($itemMedicineIds[$interaction->medicine_a_id], $itemMedicineIds[$interaction->medicine_b_id]))
            ->map(fn (DrugInteraction $interaction) => [
                'medicine_a' => $medicineNames[$interaction->medicine_a_id] ?? 'Obat A',
                'medicine_b' => $medicineNames[$interaction->medicine_b_id] ?? 'Obat B',
                'severity' => $interaction->severity->value,
                'severity_label' => $interaction->severity->label(),
                'recommendation' => $interaction->recommendation,
            ])->values();

        return [
            'prescription' => [
                'id' => $prescription->id,
                'number' => $prescription->number,
                'status' => $prescription->status->value,
                'status_label' => $prescription->status->label(),
                'created_at_label' => $prescription->created_at?->locale('id')->translatedFormat('j M Y, H:i').' WIB',
                'notes' => $prescription->notes,
                'verification_checklist' => $prescription->verification_checklist,
                'recipient_name' => $prescription->recipient_name,
                'recipient_relationship' => $prescription->recipient_relationship,
                'handover_confirmed_at' => $prescription->handover_confirmed_at?->locale('id')->translatedFormat('j M Y, H:i').' WIB',
                'patient' => [
                    'id' => $prescription->patient->id,
                    'medical_record_number' => $prescription->patient->medical_record_number,
                    'nik' => $prescription->patient->nik,
                    'name' => $prescription->patient->name,
                    'age' => $prescription->patient->date_of_birth?->age ?? 0,
                    'date_of_birth_label' => $prescription->patient->date_of_birth?->locale('id')->translatedFormat('j F Y'),
                    'gender_label' => $prescription->patient->gender->label(),
                    'phone' => $prescription->patient->phone,
                    'address' => $prescription->patient->address,
                ],
                'doctor_name' => $prescription->doctor?->name ?? '-',
                'pharmacist_name' => $prescription->pharmacist?->name,
                'allergies' => $prescription->patient->allergies->map(fn ($a) => [
                    'allergen' => $a->allergen,
                    'note' => $a->note,
                ])->values(),
                'interactions' => $interactions,
                'items' => $prescription->items->map(function ($item): array {
                    $medicine = $item->medicine;
                    $stock = (int) ($medicine?->stock ?? 0);
                    $qty = (int) $item->quantity;

                    return [
                        'id' => $item->id,
                        'medicine_name' => $medicine?->name ?? 'Obat',
                        'active_ingredient' => $medicine?->active_ingredient,
                        'category' => $medicine?->category,
                        'strength' => $medicine?->strength,
                        'unit' => $medicine?->unit,
                        'dosage' => $item->dosage,
                        'quantity' => $qty,
                        'instructions' => $item->instructions,
                        'stock' => $stock,
                        'min_stock' => (int) ($medicine?->minimum_stock ?? 0),
                        'stock_sufficient' => $stock >= $qty,
                        'medicine_active' => $medicine?->status?->value === 'aktif',
                    ];
                })->values(),
                'next_action' => $this->nextAction($prescription),
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function nextAction(Prescription $prescription): ?array
    {
        return match ($prescription->status) {
            PrescriptionStatus::Menunggu => ['key' => 'accept', 'label' => 'Telaah & Terima', 'href' => route('farmasi.antrean-resep.show', $prescription)],
            PrescriptionStatus::Diterima => ['key' => 'prepare', 'label' => 'Tandai Disiapkan', 'href' => route('farmasi.antrean-resep.show', $prescription)],
            PrescriptionStatus::Disiapkan => ['key' => 'ready', 'label' => 'Tandai Siap Diambil', 'href' => route('farmasi.antrean-resep.show', $prescription)],
            PrescriptionStatus::SiapDiambil => ['key' => 'handover', 'label' => 'Konfirmasi Serah Terima', 'href' => route('farmasi.antrean-resep.handover.form', $prescription)],
            default => null,
        };
    }
}
