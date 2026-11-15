<?php

namespace App\Http\Controllers\Dokter;

use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $doctorId = (int) $request->user()->id;
        $today = today();

        $search = trim((string) $request->query('search', ''));
        $gender = (string) $request->query('gender', '');
        $status = (string) $request->query('status', '');

        $todayPatients = Patient::query()->whereDate('created_at', $today);

        $prescribedToday = fn (Builder $query) => $query
            ->where('doctor_id', $doctorId)
            ->whereDate('created_at', $today);

        $totalToday = (clone $todayPatients)->count();
        $doneToday = (clone $todayPatients)->whereHas('prescriptions', $prescribedToday)->count();

        $queueNumbers = (clone $todayPatients)
            ->orderBy('created_at')
            ->orderBy('id')
            ->pluck('id')
            ->values()
            ->mapWithKeys(fn (int $id, int $index) => [$id => $index + 1]);

        $listQuery = (clone $todayPatients)
            ->with(['allergies:id,patient_id,allergen'])
            ->withExists(['prescriptions as has_prescription_today' => $prescribedToday])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->whereLike('name', "%{$search}%")
                        ->orWhereLike('medical_record_number', "%{$search}%")
                        ->orWhereLike('nik', "%{$search}%");
                });
            })
            ->when($gender !== '', fn (Builder $query) => $query->where('gender', $gender));

        $filteredTotal = (clone $listQuery)->count();
        $filteredDone = (clone $listQuery)->whereHas('prescriptions', $prescribedToday)->count();

        $statusCounts = [
            'semua' => $filteredTotal,
            'belum' => max(0, $filteredTotal - $filteredDone),
            'sudah' => $filteredDone,
        ];

        if ($status === 'belum') {
            $listQuery->whereDoesntHave('prescriptions', $prescribedToday);
        } elseif ($status === 'sudah') {
            $listQuery->whereHas('prescriptions', $prescribedToday);
        }

        $patients = $listQuery
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();

        $patients->through(fn (Patient $patient) => [
            'id' => $patient->id,
            'medical_record_number' => $patient->medical_record_number,
            'name' => $patient->name,
            'age' => $patient->date_of_birth?->age ?? 0,
            'gender' => $patient->gender->value,
            'gender_label' => $patient->gender->label(),
            'allergies' => $patient->allergies->pluck('allergen')->values(),
            'has_prescription_today' => (bool) $patient->has_prescription_today,
            'queue_number' => $queueNumbers->get($patient->id) ?? 0,
        ]);

        return Inertia::render('dokter/daftar-pasien', [
            'today' => now()->locale('id')->translatedFormat('l, j F Y'),
            'stats' => [
                'total_today' => $totalToday,
                'done_today' => $doneToday,
                'pending_today' => max(0, $totalToday - $doneToday),
                'progress_percent' => $totalToday > 0 ? (int) round($doneToday / $totalToday * 100) : 0,
                'prescriptions_today' => Prescription::query()
                    ->where('doctor_id', $doctorId)
                    ->whereDate('created_at', $today)
                    ->count(),
                'waiting_pharmacy' => Prescription::query()
                    ->where('doctor_id', $doctorId)
                    ->where('status', PrescriptionStatus::Menunggu)
                    ->count(),
            ],
            'patients' => $patients,
            'filters' => [
                'search' => $search,
                'gender' => $gender,
                'status' => $status,
            ],
            'status_counts' => $statusCounts,
        ]);
    }
}
