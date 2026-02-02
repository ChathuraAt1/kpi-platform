<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Task;
use App\Models\Todo;
use App\Models\ApiKey;
use App\Models\TaskLog;
use App\Policies\TaskPolicy;
use App\Policies\TodoPolicy;
use App\Policies\ApiKeyPolicy;
use App\Policies\TaskLogPolicy;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Task::class => TaskPolicy::class,
        Todo::class => TodoPolicy::class,
        ApiKey::class => ApiKeyPolicy::class,
        TaskLog::class => TaskLogPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        Gate::define('manageApiKeys', function ($user) {
            return $user->hasRole('admin');
        });
    }
}
