<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('manageApiKeys');
    }

    public function rules(): array
    {
        return [
            'provider' => 'required|string',
            'name' => 'required|string',
            'key' => 'required|string',
            'priority' => 'nullable|integer',
            'daily_quota' => 'nullable|integer',
        ];
    }
}
