<?php

namespace App\Policies;

use App\Models\TaskLog;
use App\Models\User;

class TaskLogPolicy
{
    public function view(User $user, TaskLog $log): bool
    {
        return $log->user_id === $user->id || $user->hasRole('manager') || $user->hasRole('admin');
    }

    public function approve(User $user, TaskLog $log): bool
    {
        return $user->hasRole('manager') || $user->hasRole('admin');
    }

    public function submit(User $user): bool
    {
        return $user->exists();
    }
}
