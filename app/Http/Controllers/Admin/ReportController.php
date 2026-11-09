<?php

namespace App\Http\Controllers\Admin;

use App\Enums\MedicineStatus;
use App\Enums\PrescriptionStatus;
use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportRequest;
use App\Models\DrugInteraction;
use App\Models\Medicine;
use App\Models\Prescription;
use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(ReportRequest $request): Response
    {
        return Inertia::render('admin/laporan', $this->buildReport($request));
    }

    public function export(ReportRequest $request): StreamedResponse
    {
        $report = $this->buildReport($request);

        $filename = sprintf(
            'laporan-farmasi-%s_%s.csv',
            $report['period']['start'],
            $report['period']['end'],
        );

        return response()->streamDownload(function () use ($report): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Laporan Farmasi & E-Prescribing'], ',', '"', '');
            fputcsv($handle, ['Periode', $report['period']['label']], ',', '"', '');
            fputcsv($handle, ['Total Resep Dilayani', $report['stats']['total_served']], ',', '"', '');
            fputcsv($handle, ['Rata-rata Telaah & Dispensing (menit)', $report['stats']['average_dispensing_minutes'] ?? 0], ',', '"', '');
            fputcsv($handle, ['Resep Berisiko Klinis', $report['stats']['risk_prescriptions']], ',', '"', '');
            fputcsv($handle, ['Pengeluaran Formularium', $report['stats']['formulary_spend']], ',', '"', '');
            fputcsv($handle, [], ',', '"', '');

            fputcsv($handle, [
                'Peringkat',
                'Nama Obat',
                'Golongan Farmasi',
                'Frekuensi Resep',
                'Unit Dispensing',
                'Nilai Transaksi',
                'Status Formularium',
            ], ',', '"', '');

            foreach ($report['topMedicines'] as $index => $medicine) {
                fputcsv($handle, [
                    $index + 1,
                    $medicine['name'],
                    $medicine['category'],
                    $medicine['frequency'],
                    $medicine['units'],
                    $medicine['value'],
                    $medicine['status_label'],
                ], ',', '"', '');
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReport(ReportRequest $request): array
    {
        $validated = $request->validated();
        $category = trim((string) ($validated['category'] ?? ''));

        $start = isset($validated['start'])
            ? Carbon::parse($validated['start'])->startOfDay()
            : null;
        $end = isset($validated['end'])
            ? Carbon::parse($validated['end'])->endOfDay()
            : null;

        if ($start === null && $end === null) {
            $start = now()->startOfMonth();
            $end = now()->endOfMonth();
        } elseif ($start === null) {
            $start = $end->copy()->startOfMonth();
        } elseif ($end === null) {
            $end = $start->copy()->endOfMonth();
        }

        $periodDays = max(1, (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1);

        $served = Prescription::query()
            ->where('status', PrescriptionStatus::Diserahkan->value)
            ->whereBetween('handover_confirmed_at', [$start, $end])
            ->get(['id', 'created_at', 'handover_confirmed_at']);

        $previousEnd = $start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($periodDays - 1)->startOfDay();

        $previousServed = Prescription::query()
            ->where('status', PrescriptionStatus::Diserahkan->value)
            ->whereBetween('handover_confirmed_at', [$previousStart, $previousEnd])
            ->get(['id', 'created_at', 'handover_confirmed_at']);

        $averageDispensing = $this->averageDispensingMinutes($served);
        $previousAverageDispensing = $this->averageDispensingMinutes($previousServed);
        $servedCount = $served->count();
        $previousServedCount = $previousServed->count();

        $interactionPairs = DrugInteraction::query()
            ->get(['medicine_a_id', 'medicine_b_id'])
            ->mapWithKeys(function (DrugInteraction $interaction): array {
                $first = (int) $interaction->medicine_a_id;
                $second = (int) $interaction->medicine_b_id;
                $low = min($first, $second);
                $high = max($first, $second);

                return ["{$low}-{$high}" => true];
            });

        $periodPrescriptions = Prescription::query()
            ->whereBetween('created_at', [$start, $end])
            ->with([
                'patient:id',
                'patient.allergies:id,patient_id,allergen',
                'items:id,prescription_id,medicine_id',
            ])
            ->get(['id', 'patient_id', 'status', 'created_at']);

        $riskPrescriptions = $periodPrescriptions->filter(
            fn (Prescription $prescription): bool => $this->isPrescriptionAtRisk(
                $prescription,
                $interactionPairs,
            ),
        );

        $riskCount = $riskPrescriptions->count();
        $riskFollowedUp = $riskPrescriptions
            ->filter(fn (Prescription $prescription): bool => $prescription->status === PrescriptionStatus::Diserahkan)
            ->count();

        $averagePrices = $this->averageUnitPrices();

        $outgoingMovements = StockMovement::query()
            ->where('type', StockMovementType::Keluar->value)
            ->whereBetween('created_at', [$start, $end])
            ->get(['medicine_id', 'quantity']);

        $formularySpend = (int) round($outgoingMovements->sum(
            fn (StockMovement $movement): float => $movement->quantity * ($averagePrices[$movement->medicine_id] ?? 0),
        ));

        $topRows = DB::table('prescription_items')
            ->join('prescriptions', 'prescriptions.id', '=', 'prescription_items.prescription_id')
            ->join('medicines', 'medicines.id', '=', 'prescription_items.medicine_id')
            ->whereBetween('prescriptions.created_at', [$start, $end])
            ->where('prescriptions.status', '!=', PrescriptionStatus::Dibatalkan->value)
            ->when($category !== '', fn ($query) => $query->where('medicines.category', $category))
            ->groupBy([
                'medicines.id',
                'medicines.name',
                'medicines.active_ingredient',
                'medicines.category',
                'medicines.unit',
                'medicines.strength',
                'medicines.status',
            ])
            ->orderByDesc('frequency')
            ->limit(5)
            ->get([
                'medicines.id',
                'medicines.name',
                'medicines.active_ingredient',
                'medicines.category',
                'medicines.unit',
                'medicines.strength',
                'medicines.status',
                DB::raw('COUNT(DISTINCT prescription_items.prescription_id) as frequency'),
                DB::raw('SUM(prescription_items.quantity) as units'),
            ])
            ->map(function (object $row) use ($averagePrices): array {
                $units = (int) $row->units;
                $unitPrice = $averagePrices[$row->id] ?? 0;

                return [
                    'id' => (int) $row->id,
                    'name' => $row->name,
                    'active_ingredient' => $row->active_ingredient,
                    'category' => $row->category ?? 'Tanpa Golongan',
                    'unit' => $row->unit,
                    'strength' => $row->strength,
                    'frequency' => (int) $row->frequency,
                    'units' => $units,
                    'value' => (int) round($units * $unitPrice),
                    'status' => $row->status,
                    'status_label' => $row->status === MedicineStatus::Aktif->value ? 'Aktif' : 'Nonaktif',
                ];
            })
            ->values();

        $topMedicinesTotal = DB::table('prescription_items')
            ->join('prescriptions', 'prescriptions.id', '=', 'prescription_items.prescription_id')
            ->join('medicines', 'medicines.id', '=', 'prescription_items.medicine_id')
            ->whereBetween('prescriptions.created_at', [$start, $end])
            ->where('prescriptions.status', '!=', PrescriptionStatus::Dibatalkan->value)
            ->when($category !== '', fn ($query) => $query->where('medicines.category', $category))
            ->distinct()
            ->count('medicines.id');

        return [
            'period' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'label' => $start->copy()->locale('id')->translatedFormat('j M Y')
                    .' - '.
                    $end->copy()->locale('id')->translatedFormat('j M Y'),
            ],
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'category' => $category,
            ],
            'stats' => [
                'total_served' => $servedCount,
                'previous_served' => $previousServedCount,
                'served_growth' => $previousServedCount > 0
                    ? round(($servedCount - $previousServedCount) / $previousServedCount * 100, 1)
                    : null,
                'average_daily' => round($servedCount / $periodDays, 1),
                'average_dispensing_minutes' => $averageDispensing,
                'dispensing_delta_minutes' => $averageDispensing !== null && $previousAverageDispensing !== null
                    ? round($averageDispensing - $previousAverageDispensing, 1)
                    : null,
                'risk_prescriptions' => $riskCount,
                'risk_follow_up_percent' => $riskCount > 0
                    ? round($riskFollowedUp / $riskCount * 100, 1)
                    : 100.0,
                'formulary_spend' => $formularySpend,
                'expenditure_movements' => $outgoingMovements->count(),
            ],
            'topMedicines' => $topRows,
            'topMedicinesTotal' => $topMedicinesTotal,
            'categories' => Medicine::query()
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->values()
                ->all(),
        ];
    }

    private function averageDispensingMinutes(Collection $prescriptions): ?float
    {
        $durations = $prescriptions
            ->filter(fn (Prescription $prescription): bool => $prescription->handover_confirmed_at !== null)
            ->map(fn (Prescription $prescription): float => (float) $prescription->created_at->diffInMinutes(
                $prescription->handover_confirmed_at,
            ));

        return $durations->isNotEmpty() ? round((float) $durations->avg(), 1) : null;
    }

    /**
     * @param  Collection<string, bool>  $interactionPairs
     */
    private function isPrescriptionAtRisk(Prescription $prescription, Collection $interactionPairs): bool
    {
        if (($prescription->patient?->allergies->count() ?? 0) > 0) {
            return true;
        }

        $medicineIds = $prescription->items
            ->pluck('medicine_id')
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        $count = count($medicineIds);

        for ($first = 0; $first < $count; $first++) {
            for ($second = $first + 1; $second < $count; $second++) {
                if (isset($interactionPairs["{$medicineIds[$first]}-{$medicineIds[$second]}"])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array<int, float>
     */
    private function averageUnitPrices(): array
    {
        return StockBatch::query()
            ->where('unit_price', '>', 0)
            ->get(['medicine_id', 'unit_price'])
            ->groupBy('medicine_id')
            ->map(fn (Collection $batches): float => (float) $batches->avg('unit_price'))
            ->all();
    }
}
