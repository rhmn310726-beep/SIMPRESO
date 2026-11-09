<?php

namespace App\Http\Requests\Admin;

use App\Enums\InteractionSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AllergyRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'active_ingredient' => [
                'required',
                'string',
                'max:255',
                Rule::unique('allergy_rules', 'active_ingredient')->ignore($this->route('allergyRule')),
            ],
            'drug_group' => ['nullable', 'string', 'max:255'],
            'allergen_name' => ['required', 'string', 'max:255'],
            'severity' => ['required', Rule::enum(InteractionSeverity::class)],
            'example_medicines' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'active_ingredient.required' => 'Bahan aktif atau golongan wajib diisi.',
            'active_ingredient.unique' => 'Bahan aktif ini sudah memiliki aturan alergi.',
            'allergen_name.required' => 'Nama alergen wajib diisi.',
            'severity.required' => 'Tingkat reaksi wajib dipilih.',
            'example_medicines.max' => 'Daftar contoh obat terlalu panjang.',
        ];
    }
}
