<?php

namespace App\Policies;

use App\Models\ApiKey;
use App\Models\User;

class ApiKeyPolicy
{
    public function manage(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function view(User $user, ApiKey $key): bool
    {
        return $user->hasRole('admin') || $key->user_id === $user->id;
    }
}
