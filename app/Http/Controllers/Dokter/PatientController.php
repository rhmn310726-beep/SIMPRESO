<?php

namespace App\Http\Controllers\Dokter;

use App\Enums\MedicineStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dokter\StoreAllergyRequest;
use App\Http\Requests\Dokter\StorePrescriptionRequest;
use App\Http\Requests\Dokter\UpdatePatientRequest;
use App\Models\Allergy;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Services\PrescriptionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $patients = Patient::query()
            ->withCount('allergies')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->whereLike('name', "%{$search}%")
                        ->orWhereLike('medical_record_number', "%{$search}%")
                        ->orWhereLike('nik', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Patient $patient) => [
                'id' => $patient->id,
                'medical_record_number' => $patient->medical_record_number,
                'nik' => $patient->nik,
                'name' => $patient->name,
                'age' => $patient->date_of_birth?->age ?? 0,
                'gender' => $patient->gender->value,
                'gender_label' => $patient->gender->label(),
                'phone' => $patient->phone,
                'allergies_count' => $patient->allergies_count,
                'registered_at_label' => $patient->created_at?->locale('id')->translatedFormat('j M Y'),
            ]);

        return Inertia::render('dokter/pilih-pasien', [
            'patients' => $patients,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function show(Patient $patient): Response
    {
        $patient->load(['allergies' => fn ($query) => $query->orderBy('allergen')]);

        $prescriptions = $patient->prescriptions()
            ->with(['doctor:id,name', 'items.medicine:id,name,unit'])
            ->where('created_at', '>=', now()->subYear())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $medicines = Medicine::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'active_ingredient', 'unit', 'strength', 'stock'])
            ->map(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'name' => $medicine->name,
                'active_ingredient' => $medicine->active_ingredient,
                'unit' => $medicine->unit,
                'strength' => $medicine->strength,
                'stock' => $medicine->stock,
            ])
            ->values();

        return Inertia::render('dokter/detail-pasien', [
            'patient' => [
                'id' => $patient->id,
                'medical_record_number' => $patient->medical_record_number,
                'nik' => $patient->nik,
                'name' => $patient->name,
                'date_of_birth' => $patient->date_of_birth?->toDateString(),
                'date_of_birth_label' => $patient->date_of_birth?->locale('id')->translatedFormat('j F Y'),
                'age' => $patient->date_of_birth?->age ?? 0,
                'gender' => $patient->gender->value,
                'gender_label' => $patient->gender->label(),
                'phone' => $patient->phone,
                'address' => $patient->address,
                'registered_at_label' => $patient->created_at?->locale('id')->translatedFormat('j F Y'),
            ],
            'allergies' => $patient->allergies
                ->map(fn (Allergy $allergy) => [
                    'id' => $allergy->id,
                    'allergen' => $allergy->allergen,
                    'note' => $allergy->note,
                ])
                ->values(),
            'prescriptions' => $prescriptions
                ->map(fn (Prescription $prescription) => [
                    'id' => $prescription->id,
                    'number' => $prescription->number,
                    'status' => $prescription->status->value,
                    'status_label' => $prescription->status->label(),
                    'created_at_label' => $prescription->created_at?->locale('id')->translatedFormat('j M Y'),
                    'created_at_time' => $prescription->created_at !== null
                        ? $prescription->created_at->format('H:i').' WIB'
                        : null,
                    'doctor_name' => $prescription->doctor?->name,
                    'notes' => $prescription->notes,
                    'handover_at_label' => $prescription->handover_confirmed_at !== null
                        ? $prescription->handover_confirmed_at->locale('id')->translatedFormat('j M Y, H:i').' WIB'
                        : null,
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
                ])
                ->values(),
            'medicines' => $medicines,
        ]);
    }

    public function update(UpdatePatientRequest $request, Patient $patient): RedirectResponse
    {
        $patient->update($request->validated());

        return back()->with('success', "Data pasien {$patient->name} berhasil diperbarui.");
    }

    public function storeAllergy(StoreAllergyRequest $request, Patient $patient): RedirectResponse
    {
        $data = $request->validated();
        $allergen = trim($data['allergen']);

        $duplicate = $patient->allergies
            ->first(fn (Allergy $allergy) => mb_strtolower($allergy->allergen) === mb_strtolower($allergen));

        if ($duplicate !== null) {
            throw ValidationException::withMessages([
                'allergen' => 'Alergen ini sudah tercatat untuk pasien.',
            ]);
        }

        $patient->allergies()->create([
            'allergen' => $allergen,
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', "Data alergi {$allergen} berhasil ditambahkan.");
    }

    public function destroyAllergy(Patient $patient, Allergy $allergy): RedirectResponse
    {
        abort_unless($allergy->patient_id === $patient->id, 404);

        $allergen = $allergy->allergen;
        $allergy->delete();

        return back()->with('success', "Data alergi {$allergen} berhasil dihapus.");
    }

    public function storePrescription(
        StorePrescriptionRequest $request,
        Patient $patient,
        PrescriptionService $prescriptions,
    ): RedirectResponse {
        $data = $request->validated();
        $medicine = Medicine::query()->findOrFail($data['medicine_id']);

        if ($medicine->status !== MedicineStatus::Aktif) {
            throw ValidationException::withMessages([
                'medicine_id' => 'Obat ini tidak aktif di formularium.',
            ]);
        }

        if ($medicine->stock < (int) $data['quantity']) {
            throw ValidationException::withMessages([
                'quantity' => 'Stok obat tidak mencukupi. Tersedia '.$medicine->stock.' '.$medicine->unit.'.',
            ]);
        }

        $prescription = $prescriptions->create(
            $patient,
            (int) $request->user()->id,
            [[
                'medicine_id' => $medicine->id,
                'dosage' => $data['dosage'],
                'quantity' => (int) $data['quantity'],
                'instructions' => $data['instructions'],
            ]],
            $data['notes'] ?? null,
        );

        return back()->with(
            'success',
            "Resep {$prescription->number} berhasil dikirim ke Instalasi Farmasi.",
        );
    }
}
