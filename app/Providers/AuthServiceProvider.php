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
            if (($user->role ?? '') === 'admin' || ($user->role ?? '') === 'it_admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('admin') || $user->hasRole('it_admin')) : false;
        });

        Gate::define('manageUsers', function ($user) {
            if (($user->role ?? '') === 'admin' || ($user->role ?? '') === 'hr') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('admin') || $user->hasRole('hr')) : false;
        });

        // Evaluation-related gates
        Gate::define('manageEvaluations', function ($user) {
            if (($user->role ?? '') === 'admin' || ($user->role ?? '') === 'hr' || ($user->role ?? '') === 'it_admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('admin') || $user->hasRole('hr') || $user->hasRole('it_admin')) : false;
        });

        Gate::define('viewEvaluations', function ($user) {
            // Employees view their own, supervisors view team, HR/Admin view all.
            // This gate controls access to the LIST endpoint generally.
            return true;
        });

        Gate::define('approveEvaluations', function ($user) {
            if (($user->role ?? '') === 'supervisor' || ($user->role ?? '') === 'admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('supervisor') || $user->hasRole('admin')) : false;
        });

        Gate::define('publishEvaluations', function ($user) {
            if (($user->role ?? '') === 'hr' || ($user->role ?? '') === 'admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('hr') || $user->hasRole('admin')) : false;
        });

        Gate::define('manageKpiCategories', function ($user) {
            if (($user->role ?? '') === 'hr' || ($user->role ?? '') === 'admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('hr') || $user->hasRole('admin')) : false;
        });

        Gate::define('manageJobRoles', function ($user) {
            if (($user->role ?? '') === 'hr' || ($user->role ?? '') === 'admin') return true;
            return method_exists($user, 'hasRole') ? ($user->hasRole('hr') || $user->hasRole('admin')) : false;
        });
    }
}
