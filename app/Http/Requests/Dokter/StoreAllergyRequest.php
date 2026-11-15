<?php

namespace App\Http\Requests\Dokter;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAllergyRequest extends FormRequest
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
        $patientId = $this->route('patient')?->id;

        return [
            'allergen' => [
                'required',
                'string',
                'max:255',
                Rule::unique('allergies', 'allergen')
                    ->where(fn ($query) => $query->where('patient_id', $patientId)),
            ],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'allergen.required' => 'Nama alergen wajib diisi.',
            'allergen.unique' => 'Alergen ini sudah tercatat untuk pasien.',
            'allergen.max' => 'Nama alergen terlalu panjang.',
            'note.max' => 'Catatan manifestasi terlalu panjang.',
        ];
    }
}
