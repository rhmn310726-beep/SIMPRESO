<?php

namespace App\Http\Requests\Farmasi;

use Illuminate\Foundation\Http\FormRequest;

class CancelPrescriptionRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan penolakan/revisi wajib diisi.',
            'reason.max' => 'Alasan terlalu panjang.',
        ];
    }
}
