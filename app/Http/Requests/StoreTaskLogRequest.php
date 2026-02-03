<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date',
            'rows' => 'required|array|min:1',
            'rows.*.task_id' => 'nullable|exists:tasks,id',
            'rows.*.duration_hours' => 'required|numeric',
            'rows.*.start_time' => 'nullable|date_format:H:i',
            'rows.*.end_time' => 'nullable|date_format:H:i',
            'rows.*.description' => 'nullable|string',
            'rows.*.completion_percent' => 'nullable|numeric|min:0|max:100',
            'rows.*.kpi_category_id' => 'nullable|exists:kpi_categories,id',
        ];
    }
}
