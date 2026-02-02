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
            return method_exists($user, 'hasRole') ? $user->hasRole('admin') : true;
        });

        Gate::define('manageUsers', function ($user) {
            return method_exists($user, 'hasRole') ? ($user->hasRole('admin') || $user->hasRole('management')) : true;
        });

        // Evaluation-related gates
        Gate::define('manageEvaluations', function ($user) {
            return method_exists($user, 'hasRole') ? ($user->hasRole('admin') || $user->hasRole('hr')) : true;
        });

        Gate::define('viewEvaluations', function ($user) {
            return true; // allow by default; restrict further in production
        });

        Gate::define('approveEvaluations', function ($user) {
            return method_exists($user, 'hasRole') ? ($user->hasRole('manager') || $user->hasRole('hr') || $user->hasRole('admin')) : true;
        });

        Gate::define('publishEvaluations', function ($user) {
            return method_exists($user, 'hasRole') ? $user->hasRole('hr') : true;
        });
    }
}
