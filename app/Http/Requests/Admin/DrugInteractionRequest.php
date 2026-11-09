<?php

namespace App\Http\Requests\Admin;

use App\Enums\InteractionSeverity;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DrugInteractionRequest extends FormRequest
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
            'medicine_a_id' => ['required', 'integer', 'exists:medicines,id'],
            'medicine_b_id' => ['required', 'integer', 'exists:medicines,id', 'different:medicine_a_id'],
            'severity' => ['required', Rule::enum(InteractionSeverity::class)],
            'recommendation' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'medicine_a_id.required' => 'Obat primer wajib dipilih.',
            'medicine_a_id.exists' => 'Obat primer tidak ditemukan.',
            'medicine_b_id.required' => 'Obat sekunder wajib dipilih.',
            'medicine_b_id.exists' => 'Obat sekunder tidak ditemukan.',
            'medicine_b_id.different' => 'Obat sekunder harus berbeda dari obat primer.',
            'severity.required' => 'Tingkat keparahan wajib dipilih.',
            'recommendation.required' => 'Efek klinis atau rekomendasi wajib diisi.',
            'recommendation.max' => 'Rekomendasi terlalu panjang.',
        ];
    }
}
