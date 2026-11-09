<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReportRequest extends FormRequest
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
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date', 'after_or_equal:start'],
            'category' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'start.date' => 'Tanggal mulai tidak valid.',
            'end.date' => 'Tanggal akhir tidak valid.',
            'end.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
            'category.max' => 'Filter golongan terlalu panjang.',
        ];
    }
}
