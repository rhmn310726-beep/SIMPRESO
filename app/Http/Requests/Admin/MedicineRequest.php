<?php

namespace App\Http\Requests\Admin;

use App\Enums\MedicineStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MedicineRequest extends FormRequest
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
            'code' => [
                'required',
                'string',
                'max:30',
                Rule::unique('medicines', 'code')->ignore($this->route('medicine')),
            ],
            'name' => ['required', 'string', 'max:255'],
            'active_ingredient' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:50'],
            'strength' => ['nullable', 'string', 'max:100'],
            'stock' => ['required', 'integer', 'min:0'],
            'minimum_stock' => ['required', 'integer', 'min:0'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', Rule::enum(MedicineStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode obat wajib diisi.',
            'code.unique' => 'Kode obat sudah digunakan.',
            'name.required' => 'Nama obat wajib diisi.',
            'active_ingredient.required' => 'Bahan aktif wajib diisi untuk pengecekan alergi.',
            'category.required' => 'Kategori farmakologi wajib dipilih.',
            'unit.required' => 'Bentuk sediaan wajib dipilih.',
            'stock.required' => 'Stok awal wajib diisi.',
            'stock.min' => 'Stok tidak boleh negatif.',
            'minimum_stock.required' => 'Stok minimum wajib diisi.',
            'minimum_stock.min' => 'Stok minimum tidak boleh negatif.',
            'status.required' => 'Status ketersediaan wajib dipilih.',
        ];
    }
}
