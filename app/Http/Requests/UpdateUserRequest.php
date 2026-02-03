<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && ($this->user()->hasRole('admin') || $this->user()->hasRole('hr') || $this->user()->hasRole('it_admin'));
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'role' => 'nullable|string|in:employee,supervisor,hr,management,admin,it_admin',
            'supervisor_id' => 'nullable|exists:users,id',
            'job_role_id' => 'nullable|exists:job_roles,id',
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
            'breaks' => 'nullable|array',
            'breaks.*.start' => 'required_with:breaks|date_format:H:i',
            'breaks.*.end' => 'required_with:breaks|date_format:H:i',
            'timezone' => 'nullable|string',
        ];
    }
}
