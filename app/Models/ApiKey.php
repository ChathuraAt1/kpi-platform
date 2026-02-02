<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'provider',
        'name',
        'encrypted_key',
        'priority',
        'meta',
        'daily_quota',
        'daily_usage',
        'status',
        'last_checked_at',
        'failure_count',
        'cooldown_until',
    ];

    protected $casts = [
        'meta' => 'array',
        'last_checked_at' => 'datetime',
        'cooldown_until' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
