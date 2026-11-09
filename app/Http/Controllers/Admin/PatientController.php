<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PatientRequest;
use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $gender = (string) $request->query('gender', '');
        $onlyAllergies = $request->boolean('allergy');

        $patients = Patient::query()
            ->with('allergies:id,patient_id,allergen')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('medical_record_number', 'like', "%{$search}%")
                        ->orWhere('nik', 'like', "%{$search}%");
                });
            })
            ->when($gender !== '', fn ($query) => $query->where('gender', $gender))
            ->when($onlyAllergies, fn ($query) => $query->whereHas('allergies'))
            ->orderBy('medical_record_number')
            ->paginate(10)
            ->withQueryString();

        $histories = Prescription::query()
            ->whereIn('patient_id', $patients->getCollection()->pluck('id'))
            ->orderByDesc('created_at')
            ->get(['id', 'number', 'patient_id', 'status', 'created_at'])
            ->groupBy('patient_id');

        $patients->through(fn (Patient $patient) => [
            'id' => $patient->id,
            'medical_record_number' => $patient->medical_record_number,
            'nik' => $patient->nik,
            'name' => $patient->name,
            'date_of_birth' => $patient->date_of_birth?->toDateString(),
            'age' => $patient->date_of_birth?->age ?? 0,
            'gender' => $patient->gender->value,
            'gender_label' => $patient->gender->label(),
            'phone' => $patient->phone,
            'address' => $patient->address,
            'allergies' => $patient->allergies->pluck('allergen')->values(),
            'allergies_count' => $patient->allergies->count(),
            'prescriptions' => $histories->get($patient->id, collect())
                ->take(5)
                ->map(fn (Prescription $prescription) => [
                    'id' => $prescription->id,
                    'number' => $prescription->number,
                    'status' => $prescription->status->value,
                    'status_label' => $prescription->status->label(),
                    'created_at' => $prescription->created_at?->toIso8601String(),
                ])
                ->values(),
        ]);

        $total = Patient::query()->count();
        $withAllergies = Patient::query()->whereHas('allergies')->count();
        $currentMonth = now();
        $previousMonth = now()->subMonthNoOverflow();
        $newThisMonth = Patient::query()
            ->whereYear('created_at', $currentMonth->year)
            ->whereMonth('created_at', $currentMonth->month)
            ->count();
        $newLastMonth = Patient::query()
            ->whereYear('created_at', $previousMonth->year)
            ->whereMonth('created_at', $previousMonth->month)
            ->count();

        return Inertia::render('admin/pasien', [
            'patients' => $patients,
            'filters' => [
                'search' => $search,
                'gender' => $gender,
                'allergy' => $onlyAllergies,
            ],
            'stats' => [
                'total' => $total,
                'with_allergies' => $withAllergies,
                'allergy_percent' => $total > 0 ? round($withAllergies / $total * 100, 1) : 0.0,
                'new_this_month' => $newThisMonth,
                'new_last_month' => $newLastMonth,
                'growth_percent' => $newLastMonth > 0
                    ? round(($newThisMonth - $newLastMonth) / $newLastMonth * 100, 1)
                    : null,
                'period' => $currentMonth->locale('id')->translatedFormat('F'),
            ],
            'next_medical_record_number' => $this->nextMedicalRecordNumber(),
        ]);
    }

    public function store(PatientRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            $patient = Patient::query()->create([
                'medical_record_number' => $data['medical_record_number'],
                'nik' => $data['nik'] ?? null,
                'name' => $data['name'],
                'date_of_birth' => now()->subYears((int) $data['age'])->toDateString(),
                'gender' => $data['gender'],
                'phone' => $data['phone'],
            ]);

            $this->syncAllergies($patient, $data['allergy'] ?? '');
        });

        return back()->with('success', 'Data pasien baru berhasil didaftarkan.');
    }

    public function update(PatientRequest $request, Patient $patient): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $patient): void {
            $patient->update([
                'medical_record_number' => $data['medical_record_number'],
                'nik' => $data['nik'] ?? null,
                'name' => $data['name'],
                'date_of_birth' => now()->subYears((int) $data['age'])->toDateString(),
                'gender' => $data['gender'],
                'phone' => $data['phone'],
            ]);

            $this->syncAllergies($patient, $data['allergy'] ?? '');
        });

        return back()->with('success', "Data pasien {$patient->name} berhasil diperbarui.");
    }

    public function destroy(Patient $patient): RedirectResponse
    {
        if ($patient->prescriptions()->exists()) {
            return back()->with(
                'error',
                'Pasien ini sudah memiliki riwayat resep sehingga tidak bisa dihapus.',
            );
        }

        $patient->delete();

        return back()->with('success', "Data pasien {$patient->name} berhasil dihapus.");
    }

    public function export(): StreamedResponse
    {
        $patients = Patient::query()
            ->with('allergies:id,patient_id,allergen')
            ->orderBy('medical_record_number')
            ->get();

        return response()->streamDownload(function () use ($patients): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'No. RM',
                'NIK',
                'Nama Pasien',
                'Tanggal Lahir',
                'Usia',
                'Jenis Kelamin',
                'No. Telepon',
                'Riwayat Alergi',
            ], ',', '"', '');

            foreach ($patients as $patient) {
                fputcsv($handle, [
                    $patient->medical_record_number,
                    $patient->nik,
                    $patient->name,
                    $patient->date_of_birth?->format('d/m/Y'),
                    $patient->date_of_birth?->age ?? 0,
                    $patient->gender->label(),
                    $patient->phone,
                    $patient->allergies->pluck('allergen')->implode('; '),
                ], ',', '"', '');
            }

            fclose($handle);
        }, 'data-pasien.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function syncAllergies(Patient $patient, string $raw): void
    {
        $allergens = collect(explode(',', $raw))
            ->map(fn (string $item) => trim($item))
            ->filter(fn (string $item) => $item !== '')
            ->unique(fn (string $item) => mb_strtolower($item))
            ->values();

        $patient->allergies()->whereNotIn('allergen', $allergens->all())->delete();

        foreach ($allergens as $allergen) {
            $patient->allergies()->firstOrCreate(['allergen' => $allergen]);
        }
    }

    private function nextMedicalRecordNumber(): string
    {
        $max = Patient::query()
            ->pluck('medical_record_number')
            ->map(fn (string $code) => (int) preg_replace('/\D/', '', $code))
            ->max() ?? 0;

        $next = $max + 1;

        do {
            $candidate = 'RM-'.str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $exists = Patient::query()->where('medical_record_number', $candidate)->exists();
            $next++;
        } while ($exists);

        return $candidate;
    }
}
