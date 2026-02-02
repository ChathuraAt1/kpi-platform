<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|string',
            'completed' => 'nullable|boolean',
        ];
    }
}
