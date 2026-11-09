<?php

namespace App\Http\Controllers\Admin;

use App\Enums\MedicineStatus;
use App\Enums\StockMovementType;
use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $onlineUsers = DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', now()->subMinutes(15)->timestamp)
            ->distinct()
            ->count('user_id');

        $criticalStockQuery = Medicine::query()
            ->active()
            ->whereColumn('stock', '<=', 'minimum_stock');

        $criticalStock = (clone $criticalStockQuery)->count();
        $outOfStock = (clone $criticalStockQuery)->where('stock', 0)->count();

        $lowStock = (clone $criticalStockQuery)
            ->orderBy('stock')
            ->orderBy('name')
            ->limit(5)
            ->get(['id', 'name', 'active_ingredient', 'unit', 'stock', 'minimum_stock'])
            ->map(fn (Medicine $medicine) => [
                'id' => $medicine->id,
                'name' => $medicine->name,
                'subtitle' => trim($medicine->active_ingredient.' • '.$medicine->unit, ' •'),
                'stock' => $medicine->stock,
                'minimum_stock' => $medicine->minimum_stock,
                'is_out' => $medicine->stock === 0,
            ]);

        return Inertia::render('admin/dashboard', [
            'today' => now()->locale('id')->translatedFormat('l, j F Y'),
            'stats' => [
                'active_medicines' => Medicine::query()->active()->count(),
                'inactive_medicines' => Medicine::query()
                    ->where('status', MedicineStatus::Nonaktif->value)
                    ->count(),
                'critical_stock' => $criticalStock,
                'out_of_stock' => $outOfStock,
                'total_patients' => Patient::query()->count(),
                'patients_today' => Patient::query()->whereDate('created_at', today())->count(),
                'total_users' => User::query()->count(),
                'online_users' => $onlineUsers,
            ],
            'low_stock' => $lowStock,
            'activities' => $this->recentActivities(),
        ]);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function recentActivities(): array
    {
        $handovers = Prescription::query()
            ->whereNotNull('handover_confirmed_at')
            ->with('pharmacist:id,name')
            ->latest('handover_confirmed_at')
            ->limit(3)
            ->get()
            ->map(fn (Prescription $prescription) => [
                'id' => 'handover-'.$prescription->id,
                'type' => 'handover',
                'title' => "Resep #{$prescription->number} diserahkan oleh ".($prescription->pharmacist?->name ?? 'Petugas Farmasi'),
                'description' => 'Loket Farmasi',
                'at' => $prescription->handover_confirmed_at->toIso8601String(),
                'time' => $prescription->handover_confirmed_at->locale('id')->diffForHumans(),
            ]);

        $movements = StockMovement::query()
            ->with(['medicine:id,name', 'prescription:id,number'])
            ->latest()
            ->limit(3)
            ->get()
            ->map(function (StockMovement $movement) {
                $isIncoming = $movement->type === StockMovementType::Masuk;
                $medicineName = $movement->medicine?->name ?? 'Obat';
                $prescriptionNumber = $movement->prescription?->number;

                return [
                    'id' => 'movement-'.$movement->id,
                    'type' => $isIncoming ? 'in' : 'out',
                    'title' => $isIncoming
                        ? "Stok {$medicineName} bertambah {$movement->quantity}"
                        : "Stok {$medicineName} berkurang {$movement->quantity}",
                    'description' => $isIncoming
                        ? ($movement->note ?? 'Penambahan stok')
                        : ($prescriptionNumber !== null
                            ? "Pengeluaran Resep #{$prescriptionNumber}"
                            : 'Pengeluaran stok'),
                    'at' => $movement->created_at->toIso8601String(),
                    'time' => $movement->created_at->locale('id')->diffForHumans(),
                ];
            });

        $newUsers = User::query()
            ->latest()
            ->limit(2)
            ->get()
            ->map(fn (User $user) => [
                'id' => 'user-'.$user->id,
                'type' => 'user',
                'title' => 'Akun baru dibuat: '.$user->name,
                'description' => 'Akses '.$user->role->label(),
                'at' => $user->created_at->toIso8601String(),
                'time' => $user->created_at->locale('id')->diffForHumans(),
            ]);

        return $handovers
            ->concat($movements)
            ->concat($newUsers)
            ->sortByDesc('at')
            ->take(5)
            ->values()
            ->all();
    }
}
