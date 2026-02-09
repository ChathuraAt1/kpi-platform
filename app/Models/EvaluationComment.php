<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_id',
        'user_id',
        'content',
        'type',
        'mentions',
    ];

    protected $casts = [
        'mentions' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(MonthlyEvaluation::class, 'evaluation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Add a comment to an evaluation
     */
    public static function addComment(MonthlyEvaluation $evaluation, User $user, string $content, string $type = 'remark', array $mentions = null): self
    {
        return static::create([
            'evaluation_id' => $evaluation->id,
            'user_id' => $user->id,
            'content' => htmlspecialchars($content, ENT_QUOTES, 'UTF-8'),
            'type' => $type,
            'mentions' => $mentions,
        ]);
    }

    /**
     * Get all remarks (filtering by type)
     */
    public function scopeRemarks($query)
    {
        return $query->where('type', 'remark');
    }

    /**
     * Get only comments from HR users
     */
    public function scopeFromHr($query)
    {
        return $query->whereHas('user', function ($q) {
            $q->where('role', 'hr');
        });
    }

    /**
     * Get only comments from supervisors
     */
    public function scopeFromSupervisor($query)
    {
        return $query->whereHas('user', function ($q) {
            $q->whereIn('role', ['supervisor', 'manager']);
        });
    }
}
