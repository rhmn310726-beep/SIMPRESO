<?php

namespace App\Http\Requests\Dokter;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
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
            'medicine_id' => ['required', 'integer', 'exists:medicines,id'],
            'dosage' => ['required', 'string', 'max:100'],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'instructions' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'medicine_id.required' => 'Obat dari formularium wajib dipilih.',
            'medicine_id.exists' => 'Obat yang dipilih tidak ditemukan.',
            'dosage.required' => 'Dosis atau kekuatan obat wajib diisi.',
            'quantity.required' => 'Jumlah obat wajib diisi.',
            'quantity.integer' => 'Jumlah obat harus berupa angka.',
            'quantity.min' => 'Jumlah obat minimal 1.',
            'quantity.max' => 'Jumlah obat terlalu banyak.',
            'instructions.required' => 'Aturan pakai (signa) wajib diisi.',
            'notes.max' => 'Catatan untuk farmasi terlalu panjang.',
        ];
    }
}
