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
    ];

    protected $casts = [
        'meta' => 'array',
        'last_checked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
