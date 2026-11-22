<?php

namespace App\Http\Requests\Farmasi;

use Illuminate\Foundation\Http\FormRequest;

class AcceptPrescriptionRequest extends FormRequest
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
            'checklist' => ['required', 'array'],
            'checklist.patient_identity' => ['accepted'],
            'checklist.medicine_match' => ['accepted'],
            'checklist.dose_instruction' => ['accepted'],
            'checklist.allergy_interaction' => ['accepted'],
            'checklist.availability_condition' => ['accepted'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'checklist.required' => 'Checklist verifikasi wajib dilengkapi.',
            'checklist.patient_identity.accepted' => 'Verifikasi identitas pasien wajib dicentang.',
            'checklist.medicine_match.accepted' => 'Verifikasi kesesuaian obat wajib dicentang.',
            'checklist.dose_instruction.accepted' => 'Verifikasi dosis, jumlah, dan signa wajib dicentang.',
            'checklist.allergy_interaction.accepted' => 'Pemeriksaan alergi dan interaksi obat wajib dicentang.',
            'checklist.availability_condition.accepted' => 'Pemeriksaan ketersediaan dan kondisi obat wajib dicentang.',
        ];
    }
}
