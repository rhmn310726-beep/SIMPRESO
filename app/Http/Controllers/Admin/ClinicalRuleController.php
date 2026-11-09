<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AllergyRuleRequest;
use App\Http\Requests\Admin\DrugInteractionRequest;
use App\Models\AllergyRule;
use App\Models\DrugInteraction;
use App\Models\Medicine;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicalRuleController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->query('tab') === 'interaksi' ? 'interaksi' : 'alergi';
        $search = trim((string) $request->query('search', ''));
        $severity = (string) $request->query('severity', '');

        $allergyRules = AllergyRule::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('active_ingredient', 'like', "%{$search}%")
                        ->orWhere('drug_group', 'like', "%{$search}%")
                        ->orWhere('allergen_name', 'like', "%{$search}%");
                });
            })
            ->when($severity !== '', fn ($query) => $query->where('severity', $severity))
            ->orderBy('active_ingredient')
            ->paginate(10, ['*'], 'alergi_page')
            ->withQueryString()
            ->through(fn (AllergyRule $rule) => [
                'id' => $rule->id,
                'active_ingredient' => $rule->active_ingredient,
                'drug_group' => $rule->drug_group,
                'allergen_name' => $rule->allergen_name,
                'severity' => $rule->severity->value,
                'severity_label' => $rule->severity->label(),
                'example_medicines' => $rule->example_medicines ?? [],
                'updated_at' => $rule->updated_at?->toIso8601String(),
            ]);

        $interactions = DrugInteraction::query()
            ->with([
                'medicineA:id,name,strength,unit',
                'medicineB:id,name,strength,unit',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->whereHas('medicineA', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('medicineB', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhere('recommendation', 'like', "%{$search}%");
                });
            })
            ->when($severity !== '', fn ($query) => $query->where('severity', $severity))
            ->orderByDesc('updated_at')
            ->paginate(10, ['*'], 'interaksi_page')
            ->withQueryString()
            ->through(fn (DrugInteraction $interaction) => [
                'id' => $interaction->id,
                'medicine_a_id' => $interaction->medicine_a_id,
                'medicine_b_id' => $interaction->medicine_b_id,
                'medicine_a' => $this->medicineLabel($interaction->medicineA),
                'medicine_b' => $this->medicineLabel($interaction->medicineB),
                'severity' => $interaction->severity->value,
                'severity_label' => $interaction->severity->label(),
                'recommendation' => $interaction->recommendation,
                'updated_at' => $interaction->updated_at?->toIso8601String(),
            ]);

        $totalPatients = Patient::query()->count();
        $patientsWithAllergies = Patient::query()->whereHas('allergies')->count();
        $lastUpdated = collect([
            AllergyRule::query()->max('updated_at'),
            DrugInteraction::query()->max('updated_at'),
        ])->filter()->max();

        return Inertia::render('admin/aturan', [
            'activeTab' => $tab,
            'allergyRules' => $allergyRules,
            'interactions' => $interactions,
            'filters' => [
                'search' => $search,
                'severity' => $severity,
            ],
            'stats' => [
                'total_allergy_rules' => AllergyRule::query()->count(),
                'severe_allergy_rules' => AllergyRule::query()->where('severity', 'berat')->count(),
                'total_interactions' => DrugInteraction::query()->count(),
                'severe_interactions' => DrugInteraction::query()->where('severity', 'berat')->count(),
                'patients_with_allergies' => $patientsWithAllergies,
                'patient_protection_percent' => $totalPatients > 0
                    ? round($patientsWithAllergies / $totalPatients * 100, 1)
                    : 0.0,
                'last_updated' => $lastUpdated ? Carbon::parse($lastUpdated)->toIso8601String() : null,
            ],
            'medicines' => Medicine::query()
                ->orderBy('name')
                ->get(['id', 'name', 'strength', 'unit'])
                ->map(fn (Medicine $medicine) => [
                    'id' => $medicine->id,
                    'label' => $this->medicineLabel($medicine),
                ])
                ->values(),
        ]);
    }

    public function storeAllergy(AllergyRuleRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['example_medicines'] = $this->parseExamples($data['example_medicines'] ?? '');

        AllergyRule::query()->create($data);

        return back()->with('success', 'Aturan alergi berhasil ditambahkan.');
    }

    public function updateAllergy(AllergyRuleRequest $request, AllergyRule $allergyRule): RedirectResponse
    {
        $data = $request->validated();
        $data['example_medicines'] = $this->parseExamples($data['example_medicines'] ?? '');

        $allergyRule->update($data);

        return back()->with('success', "Aturan alergi {$allergyRule->allergen_name} berhasil diperbarui.");
    }

    public function destroyAllergy(AllergyRule $allergyRule): RedirectResponse
    {
        $name = $allergyRule->allergen_name;

        $allergyRule->delete();

        return back()->with('success', "Aturan alergi {$name} berhasil dihapus.");
    }

    public function storeInteraction(DrugInteractionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $this->assertInteractionIsUnique(
            (int) $data['medicine_a_id'],
            (int) $data['medicine_b_id'],
        );

        DrugInteraction::query()->create($data);

        return back()->with('success', 'Aturan interaksi obat berhasil ditambahkan.');
    }

    public function updateInteraction(
        DrugInteractionRequest $request,
        DrugInteraction $interaction,
    ): RedirectResponse {
        $data = $request->validated();

        $this->assertInteractionIsUnique(
            (int) $data['medicine_a_id'],
            (int) $data['medicine_b_id'],
            $interaction,
        );

        $interaction->update($data);

        return back()->with('success', 'Aturan interaksi obat berhasil diperbarui.');
    }

    public function destroyInteraction(DrugInteraction $interaction): RedirectResponse
    {
        $interaction->delete();

        return back()->with('success', 'Aturan interaksi obat berhasil dihapus.');
    }

    public function export(Request $request): StreamedResponse
    {
        $tab = $request->query('tab') === 'interaksi' ? 'interaksi' : 'alergi';

        if ($tab === 'interaksi') {
            return $this->exportInteractions();
        }

        return $this->exportAllergyRules();
    }

    private function exportAllergyRules(): StreamedResponse
    {
        $rules = AllergyRule::query()->orderBy('active_ingredient')->get();

        return response()->streamDownload(function () use ($rules): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Bahan Aktif / Golongan',
                'Golongan',
                'Nama Alergen',
                'Tingkat Reaksi',
                'Contoh Obat Terkait',
            ], ',', '"', '');

            foreach ($rules as $rule) {
                fputcsv($handle, [
                    $rule->active_ingredient,
                    $rule->drug_group,
                    $rule->allergen_name,
                    $rule->severity->label(),
                    implode('; ', $rule->example_medicines ?? []),
                ], ',', '"', '');
            }

            fclose($handle);
        }, 'aturan-alergi.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function exportInteractions(): StreamedResponse
    {
        $interactions = DrugInteraction::query()
            ->with(['medicineA:id,name,strength', 'medicineB:id,name,strength'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->streamDownload(function () use ($interactions): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Obat Primer',
                'Obat Sekunder',
                'Tingkat Keparahan',
                'Efek Klinis / Rekomendasi',
            ], ',', '"', '');

            foreach ($interactions as $interaction) {
                fputcsv($handle, [
                    $this->medicineLabel($interaction->medicineA),
                    $this->medicineLabel($interaction->medicineB),
                    $interaction->severity->label(),
                    $interaction->recommendation,
                ], ',', '"', '');
            }

            fclose($handle);
        }, 'aturan-interaksi.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function assertInteractionIsUnique(
        int $medicineA,
        int $medicineB,
        ?DrugInteraction $ignore = null,
    ): void {
        $exists = DrugInteraction::query()
            ->where(function ($query) use ($medicineA, $medicineB): void {
                $query->where(function ($query) use ($medicineA, $medicineB): void {
                    $query->where('medicine_a_id', $medicineA)
                        ->where('medicine_b_id', $medicineB);
                })->orWhere(function ($query) use ($medicineA, $medicineB): void {
                    $query->where('medicine_a_id', $medicineB)
                        ->where('medicine_b_id', $medicineA);
                });
            })
            ->when(
                $ignore !== null,
                fn ($query) => $query->where('id', '!=', $ignore->getKey()),
            )
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'medicine_b_id' => 'Kombinasi interaksi untuk kedua obat ini sudah terdaftar.',
            ]);
        }
    }

    private function medicineLabel(?Medicine $medicine): string
    {
        if ($medicine === null) {
            return '-';
        }

        return trim($medicine->name.' '.($medicine->strength ?? ''));
    }

    /**
     * @return array<int, string>
     */
    private function parseExamples(string $raw): array
    {
        return collect(explode(',', $raw))
            ->map(fn (string $item) => trim($item))
            ->filter(fn (string $item) => $item !== '')
            ->unique(fn (string $item) => mb_strtolower($item))
            ->values()
            ->all();
    }
}
