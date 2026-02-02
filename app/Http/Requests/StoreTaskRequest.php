<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assignee_id' => 'nullable|exists:users,id',
            'kpi_category_id' => 'nullable|exists:kpi_categories,id',
            'planned_hours' => 'nullable|numeric',
            'due_date' => 'nullable|date',
        ];
    }
}
