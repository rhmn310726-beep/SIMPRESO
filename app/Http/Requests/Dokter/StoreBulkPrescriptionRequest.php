<?php

namespace App\Http\Requests\Dokter;

use Illuminate\Foundation\Http\FormRequest;

class StoreBulkPrescriptionRequest extends FormRequest
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
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.medicine_id' => ['required', 'integer', 'exists:medicines,id', 'distinct'],
            'items.*.dosage' => ['required', 'string', 'max:100'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'items.*.instructions' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:250'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'patient_id.required' => 'Pasien wajib dipilih sebelum membuat resep.',
            'patient_id.exists' => 'Pasien yang dipilih tidak ditemukan.',
            'items.required' => 'Tambahkan minimal satu obat ke resep.',
            'items.min' => 'Tambahkan minimal satu obat ke resep.',
            'items.max' => 'Maksimal 20 jenis obat dalam satu resep.',
            'items.*.medicine_id.required' => 'Obat dari formularium wajib dipilih.',
            'items.*.medicine_id.exists' => 'Obat yang dipilih tidak ditemukan.',
            'items.*.medicine_id.distinct' => 'Obat yang sama tidak boleh ditambahkan dua kali.',
            'items.*.dosage.required' => 'Dosis atau kekuatan obat wajib diisi.',
            'items.*.dosage.max' => 'Dosis obat terlalu panjang.',
            'items.*.quantity.required' => 'Jumlah obat wajib diisi.',
            'items.*.quantity.integer' => 'Jumlah obat harus berupa angka.',
            'items.*.quantity.min' => 'Jumlah obat minimal 1.',
            'items.*.quantity.max' => 'Jumlah obat terlalu banyak.',
            'items.*.instructions.required' => 'Aturan pakai (signa) wajib diisi.',
            'items.*.instructions.max' => 'Aturan pakai terlalu panjang.',
            'notes.max' => 'Catatan untuk farmasi maksimal 250 karakter.',
        ];
    }
}
