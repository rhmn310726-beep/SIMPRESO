<?php

namespace App\Http\Requests\Admin;

use App\Enums\Gender;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PatientRequest extends FormRequest
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
            'medical_record_number' => [
                'required',
                'string',
                'max:30',
                Rule::unique('patients', 'medical_record_number')->ignore($this->route('patient')),
            ],
            'nik' => [
                'nullable',
                'digits:16',
                Rule::unique('patients', 'nik')->ignore($this->route('patient')),
            ],
            'name' => ['required', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:0', 'max:130'],
            'gender' => ['required', Rule::enum(Gender::class)],
            'phone' => ['required', 'string', 'max:30'],
            'allergy' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'medical_record_number.required' => 'Nomor rekam medis wajib diisi.',
            'medical_record_number.unique' => 'Nomor rekam medis sudah digunakan.',
            'nik.digits' => 'NIK harus terdiri dari 16 digit angka.',
            'nik.unique' => 'NIK sudah terdaftar pada pasien lain.',
            'name.required' => 'Nama lengkap pasien wajib diisi.',
            'age.required' => 'Usia pasien wajib diisi.',
            'age.integer' => 'Usia harus berupa angka.',
            'age.min' => 'Usia tidak boleh negatif.',
            'age.max' => 'Usia tidak masuk akal.',
            'gender.required' => 'Jenis kelamin wajib dipilih.',
            'phone.required' => 'Nomor telepon wajib diisi.',
            'allergy.max' => 'Riwayat alergi terlalu panjang.',
        ];
    }
}
