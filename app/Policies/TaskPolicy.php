<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function view(User $user, Task $task): bool
    {
        return $task->owner_id === $user->id || $task->assignee_id === $user->id || $user->hasRole('manager') || $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->exists();
    }

    public function update(User $user, Task $task): bool
    {
        return $task->owner_id === $user->id || $user->hasRole('manager') || $user->hasRole('admin');
    }

    public function delete(User $user, Task $task): bool
    {
        return $task->owner_id === $user->id || $user->hasRole('admin');
    }
}
