<?php

namespace App\Policies;

use App\Models\Todo;
use App\Models\User;

class TodoPolicy
{
    public function view(User $user, Todo $todo): bool
    {
        return $todo->user_id === $user->id || $user->hasRole('manager') || $user->hasRole('admin');
    }

    public function update(User $user, Todo $todo): bool
    {
        return $todo->user_id === $user->id || $user->hasRole('admin');
    }

    public function delete(User $user, Todo $todo): bool
    {
        return $todo->user_id === $user->id || $user->hasRole('admin');
    }
}
