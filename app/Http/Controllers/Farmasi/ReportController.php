<?php

namespace App\Http\Controllers\Farmasi;

use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('farmasi/laporan', $this->buildReport($request));
    }

    public function export(Request $request): StreamedResponse
    {
        $report = $this->buildReport($request);
        $filename = sprintf('laporan-pelayanan-farmasi-%s_%s.csv', $report['period']['start'], $report['period']['end']);

        return response()->streamDownload(function () use ($report): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Laporan Pelayanan Farmasi'], ',', '"', '');
            fputcsv($handle, ['Periode', $report['period']['label']], ',', '"', '');
            fputcsv($handle, ['Total Resep Selesai', $report['stats']['total_completed']], ',', '"', '');
            fputcsv($handle, ['Rata-rata Waktu (menit)', $report['stats']['average_minutes'] ?? ''], ',', '"', '');
            fputcsv($handle, ['Tepat Waktu (%)', $report['stats']['on_time_percent']], ',', '"', '');
            fputcsv($handle, ['Total Obat Terlayani (unit)', $report['stats']['total_units']], ',', '"', '');
            fputcsv($handle, [], ',', '"', '');
            fputcsv($handle, ['Tanggal', 'Lembar Resep (dibuat)', 'Resep Selesai', 'Waktu Rata-rata (menit)', 'Kepatuhan (%)', 'Status SLA'], ',', '"', '');
            foreach ($report['daily'] as $row) {
                fputcsv($handle, [
                    $row['date_label'],
                    $row['created_count'],
                    $row['completed_count'],
                    $row['average_minutes'] ?? '-',
                    $row['on_time_percent'],
                    $row['sla_status'],
                ], ',', '"', '');
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReport(Request $request): array
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date', 'after_or_equal:start'],
            'range' => ['nullable', 'string', 'in:today,week,month,custom'],
        ]);

        [$start, $end, $range] = $this->resolvePeriod($validated);

        $served = Prescription::query()
            ->where('status', PrescriptionStatus::Diserahkan)
            ->whereNotNull('handover_confirmed_at')
            ->whereBetween('handover_confirmed_at', [$start, $end])
            ->get(['id', 'created_at', 'handover_confirmed_at']);

        $servedIds = $served->pluck('id')->all();
        $durations = $this->durations($served);
        $avgMinutes = $durations->isNotEmpty() ? round((float) $durations->avg(), 1) : null;
        $targetMinutes = 15;
        $onTimeCount = $durations->filter(fn (float $m) => $m <= $targetMinutes)->count();
        $totalCompleted = $served->count();
        $onTimePercent = $totalCompleted > 0 ? round($onTimeCount / $totalCompleted * 100, 1) : 0.0;

        $totalUnits = empty($servedIds)
            ? 0
            : (int) PrescriptionItem::query()->whereIn('prescription_id', $servedIds)->sum('quantity');

        $createdByDay = Prescription::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as aggregate')
            ->groupBy('day')
            ->pluck('aggregate', 'day');

        $servedByDay = $served->groupBy(fn (Prescription $p) => $p->handover_confirmed_at?->toDateString());

        $daily = [];
        $cursor = $start->copy()->startOfDay();
        $endDay = $end->copy()->startOfDay();
        while ($cursor->lte($endDay)) {
            $key = $cursor->toDateString();
            /** @var Collection<int, Prescription> $dayServed */
            $dayServed = $servedByDay->get($key, collect());
            $dayDurations = $this->durations($dayServed);
            $dayAvg = $dayDurations->isNotEmpty() ? round((float) $dayDurations->avg(), 1) : null;
            $dayCompleted = $dayServed->count();
            $dayOnTime = $dayDurations->filter(fn (float $m) => $m <= $targetMinutes)->count();
            $dayOnTimePercent = $dayCompleted > 0 ? round($dayOnTime / $dayCompleted * 100, 1) : 0.0;

            $daily[] = [
                'date' => $key,
                'date_label' => $cursor->locale('id')->translatedFormat('j M Y'),
                'is_today' => $cursor->isToday(),
                'created_count' => (int) ($createdByDay[$key] ?? 0),
                'completed_count' => $dayCompleted,
                'average_minutes' => $dayAvg,
                'on_time_percent' => $dayOnTimePercent,
                'sla_status' => $dayCompleted === 0 ? 'Tidak ada data' : ($dayOnTimePercent >= 95 ? 'Memenuhi Target' : 'Perlu Perhatian'),
            ];
            $cursor->addDay();
        }

        $daily = array_reverse($daily); // terbaru di atas (seperti mock)

        return [
            'period' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'range' => $range,
                'label' => $this->periodLabel($start, $end, $range),
            ],
            'filters' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'range' => $range,
            ],
            'stats' => [
                'total_completed' => $totalCompleted,
                'average_minutes' => $avgMinutes,
                'on_time_percent' => $onTimePercent,
                'on_time_count' => $onTimeCount,
                'total_units' => $totalUnits,
                'target_minutes' => $targetMinutes,
                'average_items_per_prescription' => $totalCompleted > 0 ? round($totalUnits / $totalCompleted, 2) : 0.0,
            ],
            'daily' => $daily,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function resolvePeriod(array $validated): array
    {
        $range = (string) ($validated['range'] ?? 'month');
        $now = now();

        if (isset($validated['start']) && isset($validated['end'])) {
            $range = 'custom';
            $start = Carbon::parse($validated['start'])->startOfDay();
            $end = Carbon::parse($validated['end'])->endOfDay();
        } elseif ($range === 'today') {
            $start = $now->copy()->startOfDay();
            $end = $now->copy()->endOfDay();
        } elseif ($range === 'week') {
            $start = $now->copy()->subDays(6)->startOfDay();
            $end = $now->copy()->endOfDay();
        } else {
            $range = 'month';
            $start = $now->copy()->startOfMonth();
            $end = $now->copy()->endOfMonth();
        }

        // batasi rentang agar tidak berlebihan
        if ($start->diffInDays($end) > 90) {
            $end = $start->copy()->addDays(90)->endOfDay();
        }

        return [$start, $end, $range];
    }

    private function periodLabel(Carbon $start, Carbon $end, string $range): string
    {
        return match ($range) {
            'today' => 'Hari Ini ('.$start->locale('id')->translatedFormat('j M Y').')',
            'week' => '7 Hari Terakhir ('.$start->locale('id')->translatedFormat('j M').' – '.$end->locale('id')->translatedFormat('j M Y').')',
            'month' => 'Bulan Ini ('.$start->locale('id')->translatedFormat('F Y').')',
            default => $start->locale('id')->translatedFormat('j M Y').' – '.$end->locale('id')->translatedFormat('j M Y'),
        };
    }

    /**
     * @param  Collection<int, Prescription>  $prescriptions
     * @return Collection<int, float>
     */
    private function durations(Collection $prescriptions): Collection
    {
        return $prescriptions
            ->filter(fn (Prescription $p) => $p->handover_confirmed_at !== null)
            ->map(fn (Prescription $p) => (float) $p->created_at->diffInMinutes($p->handover_confirmed_at));
    }
}
