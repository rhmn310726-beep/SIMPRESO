<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StockBatchRequest;
use App\Models\Medicine;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $location = (string) $request->query('location', '');
        $status = (string) $request->query('status', '');
        $category = (string) $request->query('category', '');
        $tab = (string) $request->query('tab', 'all');

        $batches = StockBatch::query()
            ->with(['medicine:id,code,name,active_ingredient,category,unit,stock,minimum_stock,status,storage_location'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('batch_number', 'like', "%{$search}%")
                        ->orWhereHas('medicine', function ($query) use ($search): void {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->when($location !== '', fn ($query) => $query->where('location', $location))
            ->when(
                $category !== '',
                fn ($query) => $query->whereHas('medicine', fn ($query) => $query->where('category', $category)),
            )
            ->when($status === 'aman', fn ($query) => $this->filterSafe($query))
            ->when($status === 'kritis', fn ($query) => $this->filterCritical($query))
            ->when($status === 'habis', fn ($query) => $this->filterOut($query))
            ->when($tab === 'kritis', fn ($query) => $this->filterCritical($query))
            ->when($tab === 'kadaluwarsa', fn ($query) => $this->filterExpiring($query))
            ->when($tab === 'masuk', fn ($query) => $this->filterRecent($query))
            ->orderByRaw('expired_at IS NULL')
            ->orderBy('expired_at')
            ->orderBy('batch_number')
            ->paginate(10)
            ->withQueryString();

        $movements = StockMovement::query()
            ->whereIn('medicine_id', $batches->getCollection()->pluck('medicine_id')->unique()->all())
            ->latest()
            ->get()
            ->groupBy('medicine_id')
            ->map(fn ($items) => $items->take(5)->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'quantity' => $movement->quantity,
                'note' => $movement->note,
                'at' => $movement->created_at->toIso8601String(),
                'time' => $movement->created_at->locale('id')->diffForHumans(),
            ])->values()->all());

        $batches->through(fn (StockBatch $batch) => [
            'id' => $batch->id,
            'batch_number' => $batch->batch_number,
            'location' => $batch->location,
            'storage_location' => $batch->storage_location ?? $batch->medicine->storage_location,
            'quantity' => $batch->quantity,
            'unit_price' => $batch->unit_price,
            'expired_at' => $batch->expired_at?->toDateString(),
            'received_at' => $batch->received_at?->toDateString(),
            'note' => $batch->note,
            'medicine' => [
                'id' => $batch->medicine->id,
                'code' => $batch->medicine->code,
                'name' => $batch->medicine->name,
                'active_ingredient' => $batch->medicine->active_ingredient,
                'category' => $batch->medicine->category,
                'unit' => $batch->medicine->unit,
                'stock' => $batch->medicine->stock,
                'minimum_stock' => $batch->medicine->minimum_stock,
                'status' => $batch->medicine->status->value,
            ],
            'movements' => $movements->get($batch->medicine_id, []),
        ]);

        $activeMedicines = Medicine::query()->active();

        $totalValue = StockBatch::query()
            ->get(['quantity', 'unit_price'])
            ->sum(fn (StockBatch $batch) => $batch->totalValue());

        return Inertia::render('admin/stok', [
            'batches' => $batches,
            'filters' => [
                'search' => $search,
                'location' => $location,
                'status' => $status,
                'category' => $category,
                'tab' => $tab,
            ],
            'locations' => StockBatch::query()
                ->distinct()
                ->orderBy('location')
                ->pluck('location'),
            'categories' => Medicine::query()
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
            'medicines' => Medicine::query()
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'category', 'unit', 'stock', 'minimum_stock', 'storage_location', 'status'])
                ->map(fn (Medicine $medicine) => [
                    'id' => $medicine->id,
                    'code' => $medicine->code,
                    'name' => $medicine->name,
                    'category' => $medicine->category,
                    'unit' => $medicine->unit,
                    'stock' => $medicine->stock,
                    'minimum_stock' => $medicine->minimum_stock,
                    'storage_location' => $medicine->storage_location,
                    'status' => $medicine->status->value,
                ]),
            'stats' => [
                'total_value' => $totalValue,
                'safe_skus' => (clone $activeMedicines)->whereColumn('stock', '>', 'minimum_stock')->count(),
                'critical_skus' => (clone $activeMedicines)
                    ->where('stock', '>', 0)
                    ->whereColumn('stock', '<=', 'minimum_stock')
                    ->count(),
                'out_of_stock' => (clone $activeMedicines)->where('stock', 0)->count(),
                'expiring_batches' => StockBatch::query()
                    ->where('quantity', '>', 0)
                    ->whereNotNull('expired_at')
                    ->whereDate('expired_at', '<=', today()->addDays(90))
                    ->count(),
                'total_batches' => StockBatch::query()->count(),
                'recent_batches' => StockBatch::query()
                    ->whereDate('received_at', '>=', today()->subDays(7))
                    ->count(),
            ],
        ]);
    }

    public function store(StockBatchRequest $request, StockService $stock): RedirectResponse
    {
        DB::transaction(function () use ($request, $stock): void {
            $data = $request->validated();

            $medicine = Medicine::query()->lockForUpdate()->findOrFail($data['medicine_id']);

            $stock->addBatch($medicine, $data, $request->user());
        });

        return back()->with('success', 'Stok batch baru berhasil ditambahkan.');
    }

    public function export(): StreamedResponse
    {
        $batches = StockBatch::query()
            ->with('medicine:id,code,name,unit,status')
            ->orderByRaw('expired_at IS NULL')
            ->orderBy('expired_at')
            ->orderBy('batch_number')
            ->get();

        return response()->streamDownload(function () use ($batches): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Kode Obat',
                'Nama Obat',
                'No. Batch',
                'Lokasi',
                'Rak',
                'Stok',
                'Satuan',
                'Harga Satuan',
                'Nilai Stok',
                'Tanggal Kadaluwarsa',
                'Tanggal Diterima',
                'Status',
            ], ',', '"', '');

            foreach ($batches as $batch) {
                fputcsv($handle, [
                    $batch->medicine?->code,
                    $batch->medicine?->name,
                    $batch->batch_number,
                    $batch->location,
                    $batch->storage_location,
                    $batch->quantity,
                    $batch->medicine?->unit,
                    $batch->unit_price,
                    $batch->totalValue(),
                    $batch->expired_at?->toDateString(),
                    $batch->received_at?->toDateString(),
                    $batch->medicine?->status->label(),
                ], ',', '"', '');
            }

            fclose($handle);
        }, 'laporan-stok-obat.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function filterSafe(Builder $query): Builder
    {
        return $query->whereHas('medicine', fn ($query) => $query->whereColumn('stock', '>', 'minimum_stock'));
    }

    private function filterCritical(Builder $query): Builder
    {
        return $query->whereHas('medicine', fn ($query) => $query
            ->where('stock', '>', 0)
            ->whereColumn('stock', '<=', 'minimum_stock'));
    }

    private function filterOut(Builder $query): Builder
    {
        return $query->whereHas('medicine', fn ($query) => $query->where('stock', 0));
    }

    private function filterExpiring(Builder $query): Builder
    {
        return $query->where('quantity', '>', 0)
            ->whereNotNull('expired_at')
            ->whereDate('expired_at', '<=', today()->addDays(90));
    }

    private function filterRecent(Builder $query): Builder
    {
        return $query->whereDate('received_at', '>=', today()->subDays(7));
    }
}
