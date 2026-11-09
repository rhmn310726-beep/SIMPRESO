<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MedicineRequest;
use App\Models\Medicine;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicineController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $category = (string) $request->query('category', '');
        $status = (string) $request->query('status', '');

        $medicines = Medicine::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('active_ingredient', 'like', "%{$search}%");
                });
            })
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->when($status === 'habis', fn ($query) => $query->where('stock', 0))
            ->when(
                $status === 'kritis',
                fn ($query) => $query->where('stock', '>', 0)->whereColumn('stock', '<=', 'minimum_stock'),
            )
            ->when(
                $status === 'aman',
                fn ($query) => $query->whereColumn('stock', '>', 'minimum_stock'),
            )
            ->orderBy('code')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'code' => $medicine->code,
                'name' => $medicine->name,
                'active_ingredient' => $medicine->active_ingredient,
                'category' => $medicine->category,
                'unit' => $medicine->unit,
                'strength' => $medicine->strength,
                'stock' => $medicine->stock,
                'minimum_stock' => $medicine->minimum_stock,
                'storage_location' => $medicine->storage_location,
                'notes' => $medicine->notes,
                'status' => $medicine->status->value,
            ]);

        $total = Medicine::query()->count();
        $active = Medicine::query()->active()->count();

        return Inertia::render('admin/obat', [
            'medicines' => $medicines,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'status' => $status,
            ],
            'categories' => Medicine::query()
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
            'stats' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $total - $active,
            ],
            'next_code' => $this->nextCode(),
        ]);
    }

    public function store(MedicineRequest $request, StockService $stock): RedirectResponse
    {
        DB::transaction(function () use ($request, $stock): void {
            $medicine = Medicine::query()->create($request->validated());

            $stock->createInitialBatch($medicine);
        });

        return back()->with('success', 'Data obat baru berhasil ditambahkan ke formularium.');
    }

    public function update(MedicineRequest $request, Medicine $medicine, StockService $stock): RedirectResponse
    {
        DB::transaction(function () use ($request, $medicine, $stock): void {
            $locked = Medicine::query()->lockForUpdate()->findOrFail($medicine->getKey());

            $previousStock = $locked->stock;

            $locked->update($request->validated());

            $stock->syncBatches($locked, $previousStock, $locked->stock);
        });

        $medicine->refresh();

        return back()->with('success', "Data obat {$medicine->name} berhasil diperbarui.");
    }

    public function destroy(Medicine $medicine): RedirectResponse
    {
        if ($medicine->prescriptionItems()->exists() || $medicine->stockMovements()->exists()) {
            return back()->with(
                'error',
                'Obat ini sudah memiliki riwayat resep atau stok sehingga tidak bisa dihapus. Nonaktifkan saja statusnya.',
            );
        }

        $medicine->delete();

        return back()->with('success', "Obat {$medicine->name} berhasil dihapus dari formularium.");
    }

    public function export(): StreamedResponse
    {
        $medicines = Medicine::query()->orderBy('code')->orderBy('name')->get();

        return response()->streamDownload(function () use ($medicines): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Kode',
                'Nama Obat',
                'Bahan Aktif',
                'Kategori',
                'Bentuk Sediaan',
                'Kekuatan',
                'Stok',
                'Stok Minimum',
                'Status',
            ], ',', '"', '');

            foreach ($medicines as $medicine) {
                fputcsv($handle, [
                    $medicine->code,
                    $medicine->name,
                    $medicine->active_ingredient,
                    $medicine->category,
                    $medicine->unit,
                    $medicine->strength,
                    $medicine->stock,
                    $medicine->minimum_stock,
                    $medicine->status->label(),
                ], ',', '"', '');
            }

            fclose($handle);
        }, 'formularium-obat.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function nextCode(): string
    {
        $nextId = (int) Medicine::query()->max('id') + 1;

        return 'OBT-'.str_pad((string) $nextId, 3, '0', STR_PAD_LEFT);
    }
}
