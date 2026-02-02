<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('manageApiKeys');
    }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string',
            'priority' => 'nullable|integer',
            'daily_quota' => 'nullable|integer',
            'status' => 'nullable|string',
        ];
    }
}
