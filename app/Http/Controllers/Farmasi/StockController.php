<?php

namespace App\Http\Controllers\Farmasi;

use App\Http\Controllers\Controller;
use App\Http\Requests\Farmasi\StoreStockBatchRequest;
use App\Models\Medicine;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $category = (string) $request->query('category', '');
        $status = (string) $request->query('status', '');
        $criticalOnly = filter_var($request->query('critical_only', false), FILTER_VALIDATE_BOOL);
        $tab = (string) $request->query('tab', 'fisik');
        $tab = in_array($tab, ['fisik', 'mutasi'], true) ? $tab : 'fisik';

        $base = Medicine::query();

        $totalItems = (clone $base)->count();
        $safeItems = (clone $base)->where('stock', '>', 0)->whereColumn('stock', '>', 'minimum_stock')->count();
        $criticalItems = (clone $base)->where('stock', '>', 0)->whereColumn('stock', '<=', 'minimum_stock')->count();
        $outItems = (clone $base)->where('stock', '<=', 0)->count();

        $medicines = Medicine::query()
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->whereLike('name', "%{$search}%")
                        ->orWhereLike('code', "%{$search}%")
                        ->orWhereLike('active_ingredient', "%{$search}%");
                });
            })
            ->when($category !== '', fn (Builder $query) => $query->where('category', $category))
            ->when($status === 'aman', fn (Builder $query) => $query->where('stock', '>', 0)->whereColumn('stock', '>', 'minimum_stock'))
            ->when($status === 'kritis', fn (Builder $query) => $query->where('stock', '>', 0)->whereColumn('stock', '<=', 'minimum_stock'))
            ->when($status === 'habis', fn (Builder $query) => $query->where('stock', '<=', 0))
            ->when($criticalOnly, fn (Builder $query) => $query->where(function (Builder $q): void {
                $q->where('stock', '<=', 0)->orWhereColumn('stock', '<=', 'minimum_stock');
            }))
            ->orderByRaw('CASE WHEN stock <= 0 THEN 0 WHEN stock <= minimum_stock THEN 1 ELSE 2 END')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $medicines->through(function (Medicine $medicine): array {
            $stock = (int) $medicine->stock;
            $min = (int) $medicine->minimum_stock;
            $statusKey = $stock <= 0 ? 'habis' : ($stock <= $min ? 'kritis' : 'aman');

            return [
                'id' => $medicine->id,
                'code' => $medicine->code,
                'name' => $medicine->name,
                'active_ingredient' => $medicine->active_ingredient,
                'category' => $medicine->category,
                'unit' => $medicine->unit,
                'strength' => $medicine->strength,
                'storage_location' => $medicine->storage_location,
                'stock' => $stock,
                'minimum_stock' => $min,
                'status' => $medicine->status->value,
                'stock_status' => $statusKey,
            ];
        });

        $movements = StockMovement::query()
            ->with(['medicine:id,code,name,unit', 'user:id,name'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'type_label' => $movement->type->label(),
                'quantity' => $movement->quantity,
                'note' => $movement->note,
                'at_label' => $movement->created_at?->locale('id')->translatedFormat('j M Y, H:i').' WIB',
                'medicine' => [
                    'id' => $movement->medicine?->id,
                    'code' => $movement->medicine?->code,
                    'name' => $movement->medicine?->name ?? '-',
                    'unit' => $movement->medicine?->unit,
                ],
                'user_name' => $movement->user?->name,
            ]);

        $medicineOptions = Medicine::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'unit', 'stock', 'minimum_stock', 'storage_location', 'status'])
            ->map(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'code' => $medicine->code,
                'name' => $medicine->name,
                'unit' => $medicine->unit,
                'stock' => (int) $medicine->stock,
                'minimum_stock' => (int) $medicine->minimum_stock,
                'storage_location' => $medicine->storage_location,
                'status' => $medicine->status->value,
            ]);

        return Inertia::render('farmasi/stok-obat', [
            'medicines' => $medicines,
            'medicine_options' => $medicineOptions,
            'movements' => $movements,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'status' => $status,
                'critical_only' => $criticalOnly,
                'tab' => $tab,
            ],
            'categories' => Medicine::query()
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
            'locations' => [StockService::DEFAULT_LOCATION, 'Depo Rawat Jalan', 'Depo Rawat Inap', 'Depo Farmasi IGD'],
            'stats' => [
                'total' => $totalItems,
                'safe' => $safeItems,
                'critical' => $criticalItems,
                'out' => $outItems,
            ],
            'last_synced_at' => now()->locale('id')->translatedFormat('H:i:s').' WIB',
        ]);
    }

    public function store(StoreStockBatchRequest $request, StockService $stock): RedirectResponse
    {
        DB::transaction(function () use ($request, $stock): void {
            $data = $request->validated();
            $medicine = Medicine::query()->lockForUpdate()->findOrFail($data['medicine_id']);
            $stock->addBatch($medicine, $data, $request->user());
        });

        return back()->with('success', 'Stok obat berhasil ditambahkan dan dicatat sebagai mutasi masuk.');
    }
}
