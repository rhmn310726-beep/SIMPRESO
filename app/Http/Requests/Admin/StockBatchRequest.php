<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockBatchRequest extends FormRequest
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
            'medicine_id' => ['required', 'integer', Rule::exists('medicines', 'id')],
            'batch_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('stock_batches', 'batch_number')
                    ->where(fn ($query) => $query->where('medicine_id', $this->input('medicine_id'))),
            ],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'integer', 'min:0'],
            'location' => ['required', 'string', 'max:100'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'expired_at' => ['required', 'date'],
            'received_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'medicine_id.required' => 'Obat wajib dipilih.',
            'medicine_id.exists' => 'Obat tidak ditemukan.',
            'batch_number.required' => 'Nomor batch wajib diisi.',
            'batch_number.unique' => 'Nomor batch sudah digunakan untuk obat ini.',
            'quantity.required' => 'Jumlah stok wajib diisi.',
            'quantity.min' => 'Jumlah stok minimal 1.',
            'unit_price.required' => 'Harga satuan wajib diisi.',
            'unit_price.min' => 'Harga satuan tidak boleh negatif.',
            'location.required' => 'Lokasi penyimpanan wajib dipilih.',
            'expired_at.required' => 'Tanggal kadaluwarsa wajib diisi.',
            'expired_at.date' => 'Tanggal kadaluwarsa tidak valid.',
        ];
    }
}
