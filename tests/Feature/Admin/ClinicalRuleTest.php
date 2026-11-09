<?php

namespace Tests\Feature\Admin;

use App\Models\Allergy;
use App\Models\AllergyRule;
use App\Models\DrugInteraction;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClinicalRuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/admin/aturan')->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_clinical_rules(): void
    {
        $dokter = User::factory()->create(['role' => 'dokter']);

        $this->actingAs($dokter)->get('/admin/aturan')->assertForbidden();
    }

    public function test_admin_can_view_clinical_rules_with_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        AllergyRule::create($this->allergyPayload([
            'active_ingredient' => 'Penisilin',
            'severity' => 'berat',
        ]));

        AllergyRule::create($this->allergyPayload([
            'active_ingredient' => 'Aspirin / NSAID',
            'allergen_name' => 'Alergi NSAID',
            'severity' => 'sedang',
        ]));

        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');

        DrugInteraction::create($this->interactionPayload($a, $b));

        $patient = Patient::create([
            'medical_record_number' => 'RM-001',
            'name' => 'Pasien Uji',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
        ]);

        Allergy::create(['patient_id' => $patient->id, 'allergen' => 'Penisilin']);

        $this->actingAs($admin)
            ->get('/admin/aturan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/aturan')
                ->where('activeTab', 'alergi')
                ->has('allergyRules.data', 2)
                ->has('interactions.data', 1)
                ->where('stats.total_allergy_rules', 2)
                ->where('stats.severe_allergy_rules', 1)
                ->where('stats.total_interactions', 1)
                ->where('stats.patients_with_allergies', 1)
                ->where('interactions.data.0.medicine_a', 'Warfarin 5mg')
                ->where('interactions.data.0.severity_label', 'Berat')
                ->has('medicines', 2));
    }

    public function test_admin_can_create_allergy_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->post(route('admin.aturan.allergy.store'), $this->allergyPayload([
                'example_medicines' => 'Amoxicillin, Ampicillin, amoxicillin',
            ]))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $rule = AllergyRule::query()->where('active_ingredient', 'Penisilin')->firstOrFail();

        $this->assertSame('berat', $rule->severity->value);
        $this->assertSame(['Amoxicillin', 'Ampicillin'], $rule->example_medicines);
    }

    public function test_allergy_active_ingredient_must_be_unique(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AllergyRule::create($this->allergyPayload());

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->post(route('admin.aturan.allergy.store'), $this->allergyPayload())
            ->assertSessionHasErrors('active_ingredient');

        $this->assertDatabaseCount('allergy_rules', 1);
    }

    public function test_admin_can_update_allergy_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $rule = AllergyRule::create($this->allergyPayload());

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->put(route('admin.aturan.allergy.update', $rule), $this->allergyPayload([
                'allergen_name' => 'Alergi Penisilin Berat',
                'severity' => 'ringan',
                'example_medicines' => 'Amoxicillin',
            ]))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $rule->refresh();

        $this->assertSame('Alergi Penisilin Berat', $rule->allergen_name);
        $this->assertSame('ringan', $rule->severity->value);
        $this->assertSame(['Amoxicillin'], $rule->example_medicines);
    }

    public function test_admin_can_delete_allergy_rule(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $rule = AllergyRule::create($this->allergyPayload());

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->delete(route('admin.aturan.allergy.destroy', $rule))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('allergy_rules', ['id' => $rule->id]);
    }

    public function test_admin_can_create_drug_interaction(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->post(route('admin.aturan.interaction.store'), $this->interactionPayload($a, $b))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('drug_interactions', [
            'medicine_a_id' => $a->id,
            'medicine_b_id' => $b->id,
            'severity' => 'berat',
        ]);
    }

    public function test_interaction_cannot_use_same_medicine(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $a = $this->medicine('Warfarin', '5mg');

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->post(route('admin.aturan.interaction.store'), $this->interactionPayload($a, $a))
            ->assertSessionHasErrors('medicine_b_id');

        $this->assertDatabaseCount('drug_interactions', 0);
    }

    public function test_interaction_pair_cannot_be_duplicated_in_reverse(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');

        DrugInteraction::create($this->interactionPayload($a, $b));

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->post(route('admin.aturan.interaction.store'), $this->interactionPayload($b, $a))
            ->assertSessionHasErrors('medicine_b_id');

        $this->assertDatabaseCount('drug_interactions', 1);
    }

    public function test_admin_can_update_and_delete_drug_interaction(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');
        $interaction = DrugInteraction::create($this->interactionPayload($a, $b));

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->put(route('admin.aturan.interaction.update', $interaction), $this->interactionPayload($a, $b, [
                'severity' => 'ringan',
                'recommendation' => 'Pantau tanda perdarahan ringan.',
            ]))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $interaction->refresh();

        $this->assertSame('ringan', $interaction->severity->value);
        $this->assertSame('Pantau tanda perdarahan ringan.', $interaction->recommendation);

        $this->actingAs($admin)
            ->from(route('admin.aturan.index'))
            ->delete(route('admin.aturan.interaction.destroy', $interaction))
            ->assertRedirect(route('admin.aturan.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('drug_interactions', ['id' => $interaction->id]);
    }

    public function test_clinical_rules_can_be_filtered(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        AllergyRule::create($this->allergyPayload([
            'active_ingredient' => 'Penisilin',
            'severity' => 'berat',
        ]));
        AllergyRule::create($this->allergyPayload([
            'active_ingredient' => 'Lateks',
            'allergen_name' => 'Alergi Lateks',
            'severity' => 'ringan',
        ]));

        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');

        DrugInteraction::create($this->interactionPayload($a, $b));

        $this->actingAs($admin)
            ->get('/admin/aturan?tab=alergi&severity=berat')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('allergyRules.data', 1)
                ->where('allergyRules.data.0.active_ingredient', 'Penisilin'));

        $this->actingAs($admin)
            ->get('/admin/aturan?tab=alergi&search=Lateks')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('allergyRules.data', 1)
                ->where('allergyRules.data.0.active_ingredient', 'Lateks'));

        $this->actingAs($admin)
            ->get('/admin/aturan?tab=interaksi&severity=berat')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeTab', 'interaksi')
                ->has('interactions.data', 1));
    }

    public function test_admin_can_export_clinical_rules(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        AllergyRule::create($this->allergyPayload());

        $a = $this->medicine('Warfarin', '5mg');
        $b = $this->medicine('Aspirin', '80mg');

        DrugInteraction::create($this->interactionPayload($a, $b));

        $allergyExport = $this->actingAs($admin)
            ->get(route('admin.aturan.export', ['tab' => 'alergi']));

        $allergyExport->assertOk();
        $allergyExport->assertDownload('aturan-alergi.csv');
        $this->assertStringContainsString('Penisilin', $allergyExport->streamedContent());

        $interactionExport = $this->actingAs($admin)
            ->get(route('admin.aturan.export', ['tab' => 'interaksi']));

        $interactionExport->assertOk();
        $interactionExport->assertDownload('aturan-interaksi.csv');
        $this->assertStringContainsString('Warfarin 5mg', $interactionExport->streamedContent());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function allergyPayload(array $overrides = []): array
    {
        return array_merge([
            'active_ingredient' => 'Penisilin',
            'drug_group' => 'Golongan Beta-Laktam',
            'allergen_name' => 'Alergi Penisilin',
            'severity' => 'berat',
            'example_medicines' => 'Amoxicillin, Ampicillin',
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function interactionPayload(Medicine $a, Medicine $b, array $overrides = []): array
    {
        return array_merge([
            'medicine_a_id' => $a->id,
            'medicine_b_id' => $b->id,
            'severity' => 'berat',
            'recommendation' => 'Peningkatan risiko perdarahan mayor. Hindari tanpa pemantauan INR ketat.',
        ], $overrides);
    }

    private function medicine(string $name, string $strength): Medicine
    {
        $nextId = Medicine::query()->count() + 1;

        return Medicine::create([
            'code' => 'OBT-'.str_pad((string) $nextId, 3, '0', STR_PAD_LEFT),
            'name' => $name,
            'active_ingredient' => $name,
            'category' => 'Analgesik / Antipiretik',
            'unit' => 'Tablet',
            'strength' => $strength,
            'stock' => 100,
            'minimum_stock' => 10,
            'status' => 'aktif',
        ]);
    }
}
