# KPI Platform - Critical Missing Features Implementation Guide

**Document:** Step-by-step guide for implementing highest-priority missing features  
**Target Audience:** Development team

---

## Table of Contents

1. [Submission Deadline & Late Submission Tracking](#submission-deadline--late-submission-tracking)
2. [Three-Score Evaluation System](#three-score-evaluation-system)
3. [Per-User Custom Shift Times](#per-user-custom-shift-times)
4. [HR Score Input in Evaluations](#hr-score-input-in-evaluations)
5. [Published KPI View for Employees](#published-kpi-view-for-employees)
6. [Manager/Supervisor Own KPI Scoring](#managersupervisor-own-kpi-scoring)

---

## Submission Deadline & Late Submission Tracking

### Problem
Currently, there's no enforcement of the 11 PM submission deadline, and no tracking of late submissions.

### Solution

#### Step 1: Add Database Columns

Create migration:
```bash
php artisan make:migration add_submission_tracking_to_task_logs
```

Migration file:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('task_logs', function (Blueprint $table) {
            // Deadline enforcement
            $table->timestamp('submitted_at')->nullable()->after('approved_at'); // When submitted
            $table->boolean('is_late')->default(false)->after('submitted_at'); // Was it late?
            $table->string('submission_type')->nullable()->after('is_late'); // 'morning_plan' or 'evening_log'
            $table->json('submission_metadata')->nullable()->after('submission_type'); // {deadline, time_difference_minutes, original_deadline}
        });
    }

    public function down(): void {
        Schema::table('task_logs', function (Blueprint $table) {
            $table->dropColumn(['submitted_at', 'is_late', 'submission_type', 'submission_metadata']);
        });
    }
};
```

#### Step 2: Update TaskLog Model

```php
<?php
namespace App\Models;

use Carbon\Carbon;

class TaskLog extends Model {
    protected $fillable = [
        // ... existing fields
        'submitted_at',
        'is_late',
        'submission_type',
        'submission_metadata',
    ];

    protected $casts = [
        // ... existing casts
        'submitted_at' => 'datetime',
        'submission_metadata' => 'array',
    ];

    /**
     * Mark log as submitted and check if late
     */
    public function markAsSubmitted(string $submissionType = 'evening_log'): self {
        $now = now();
        $deadline = $this->getSubmissionDeadline();
        
        $this->submitted_at = $now;
        $this->submission_type = $submissionType;
        $this->is_late = $now->isAfter($deadline);
        $this->submission_metadata = [
            'deadline' => $deadline->toIso8601String(),
            'submitted_at' => $now->toIso8601String(),
            'minutes_late' => $this->is_late ? $now->diffInMinutes($deadline) : 0,
        ];
        
        return $this;
    }

    /**
     * Get deadline for this date
     * Default: 11 PM same day
     */
    public function getSubmissionDeadline(): Carbon {
        return $this->date
            ->copy()
            ->setHour(23)
            ->setMinute(0)
            ->setSecond(0);
    }

    /**
     * Scope: only late submissions
     */
    public function scopeLate($query) {
        return $query->where('is_late', true);
    }

    /**
     * Scope: only submitted today
     */
    public function scopeSubmittedToday($query) {
        return $query->whereDate('submitted_at', now()->toDateString());
    }
}
```

#### Step 3: Update TaskLogController Store Method

```php
<?php
namespace App\Http\Controllers\Api;

use App\Models\TaskLog;

class TaskLogController extends Controller {
    public function store(StoreTaskLogRequest $request) {
        $user = $request->user();
        $dateStr = $request->input('date', now()->toDateString());
        
        // Validate individual task logs
        $rows = $request->input('rows', []);
        $submissionType = $request->input('submission_type', 'evening_log'); // 'morning_plan' or 'evening_log'
        
        $created = [];
        foreach ($rows as $row) {
            $log = new TaskLog($row);
            $log->user_id = $user->id;
            $log->date = $dateStr;
            
            // Mark as submitted and check deadline
            $log->markAsSubmitted($submissionType);
            
            // Log audit trail if late
            if ($log->is_late) {
                \App\Models\AuditLog::create([
                    'user_id' => $user->id,
                    'action' => 'task_log.submitted_late',
                    'auditable_type' => TaskLog::class,
                    'auditable_id' => $log->id,
                    'old_values' => [],
                    'new_values' => [
                        'minutes_late' => $log->submission_metadata['minutes_late'],
                        'deadline' => $log->submission_metadata['deadline'],
                    ],
                    'ip_address' => $request->ip(),
                ]);
            }
            
            $log->save();
            $created[] = $log;
        }
        
        return response()->json([
            'status' => 'submitted',
            'count' => count($created),
            'late_count' => collect($created)->where('is_late', true)->count(),
            'data' => $created,
        ]);
    }
}
```

#### Step 4: Add Deadline Status Endpoint

```php
<?php
// In TaskLogController

public function submissionStatus(Request $request) {
    $user = $request->user();
    $today = now()->toDateString();
    
    // Check if user has submitted evening log today
    $hasEveningSubmission = TaskLog::where('user_id', $user->id)
        ->whereDate('date', $today)
        ->where('submission_type', 'evening_log')
        ->where('submitted_at', '!=', null)
        ->exists();
    
    $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
    $minutesRemaining = max(0, (int)$deadline->diffInMinutes(now(), false));
    $isDeadlineApproaching = $minutesRemaining < 60; // Less than 1 hour
    
    return response()->json([
        'has_evening_submission' => $hasEveningSubmission,
        'deadline' => $deadline->toIso8601String(),
        'minutes_remaining' => $minutesRemaining,
        'is_approaching_deadline' => $isDeadlineApproaching,
        'current_time' => now()->toIso8601String(),
    ]);
}
```

Add to routes:
```php
Route::get('task-logs/status/submission', [TaskLogController::class, 'submissionStatus']);
```

#### Step 5: Add Admin Endpoint for Missing Submissions

```php
<?php
// In ReportingController

public function missingSubmissions(Request $request) {
    $this->authorize('manageUsers');
    
    $today = now()->toDateString();
    $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
    
    // Get all active employees
    $allUsers = \App\Models\User::where('role', 'employee')
        ->where('status', '!=', 'inactive')
        ->get();
    
    $missing = [];
    foreach ($allUsers as $user) {
        $hasSubmission = TaskLog::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->where('submission_type', 'evening_log')
            ->where('submitted_at', '!=', null)
            ->exists();
        
        if (!$hasSubmission) {
            $missing[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'deadline' => $deadline->toIso8601String(),
                'supervisor_id' => $user->supervisor_id,
                'supervisor_name' => $user->supervisor?->name,
            ];
        }
    }
    
    return response()->json([
        'date' => $today,
        'deadline' => $deadline->toIso8601String(),
        'total_employees' => $allUsers->count(),
        'missing_count' => count($missing),
        'missing_submissions' => $missing,
    ]);
}
```

#### Step 6: Frontend Deadline Timer Component

Create `resources/js/components/DeadlineTimer.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function DeadlineTimer() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get('/api/task-logs/status/submission');
                setStatus(res.data);
            } catch (e) {
                console.error('Failed to fetch submission status', e);
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading || !status) return null;

    const { minutes_remaining, is_approaching_deadline, has_evening_submission } = status;

    if (has_evening_submission) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-700 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                Daily submission completed ✓
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-3 ${
            is_approaching_deadline 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-orange-50 border border-orange-200 text-orange-700'
        }`}>
            <div className={`w-3 h-3 rounded-full ${
                is_approaching_deadline 
                    ? 'bg-red-600 animate-pulse' 
                    : 'bg-orange-600'
            }`}></div>
            <div>
                <span className="block">
                    {is_approaching_deadline ? '⚠️ URGENT: ' : ''}
                    Daily submission deadline: 
                </span>
                <span className="text-lg font-black">
                    {minutes_remaining} minute{minutes_remaining !== 1 ? 's' : ''} remaining
                </span>
            </div>
        </div>
    );
}
```

Use in EmployeeDashboard:
```jsx
import DeadlineTimer from "../components/DeadlineTimer";

export default function EmployeeDashboard() {
    return (
        <div className="space-y-6">
            <DeadlineTimer />
            {/* Rest of component */}
        </div>
    );
}
```

---

## Three-Score Evaluation System

### Problem
Currently only Rule-Based and LLM scores exist. HR and Supervisor scores are missing, and final score calculation is incomplete.

### Solution

#### Step 1: Database Schema Updates

Create migration:
```php
php artisan make:migration update_monthly_evaluations_for_three_scores
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('monthly_evaluations', function (Blueprint $table) {
            // Add individual score fields
            $table->json('rule_based_scores')->nullable()->after('breakdown'); // By category
            $table->json('llm_scores')->nullable()->after('rule_based_scores');
            $table->json('hr_scores')->nullable()->after('llm_scores'); // NEW
            $table->json('supervisor_scores')->nullable()->after('hr_scores'); // NEW
            
            // Add comments/remarks
            $table->longText('hr_remarks')->nullable()->after('supervisor_scores');
            $table->string('hr_remarks_by')->nullable()->after('hr_remarks');
            $table->timestamp('hr_remarks_at')->nullable()->after('hr_remarks_by');
            
            $table->longText('supervisor_remarks')->nullable()->after('hr_remarks_at');
            $table->string('supervisor_remarks_by')->nullable()->after('supervisor_remarks');
            $table->timestamp('supervisor_remarks_at')->nullable()->after('supervisor_remarks_by');
            
            // Tracking
            $table->string('final_score_status')->default('pending'); // pending, calculated, published
            $table->decimal('final_score', 5, 2)->nullable()->change(); // Already exists, just ensuring type
        });
    }

    public function down(): void {
        Schema::table('monthly_evaluations', function (Blueprint $table) {
            $table->dropColumn([
                'rule_based_scores', 'llm_scores', 'hr_scores', 'supervisor_scores',
                'hr_remarks', 'hr_remarks_by', 'hr_remarks_at',
                'supervisor_remarks', 'supervisor_remarks_by', 'supervisor_remarks_at',
                'final_score_status'
            ]);
        });
    }
};
```

#### Step 2: Create EvaluationScore Model

```bash
php artisan make:model EvaluationScore
```

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluationScore extends Model {
    protected $fillable = [
        'monthly_evaluation_id',
        'kpi_category_id',
        'score_type', // 'rule_based', 'llm', 'hr', 'supervisor'
        'score', // 0-10
        'confidence', // 0-1 (for LLM scores)
        'scorer_id', // Who entered the score
        'remarks',
        'metadata',
    ];

    protected $casts = [
        'score' => 'decimal:2',
        'confidence' => 'decimal:2',
        'metadata' => 'array',
    ];

    public function evaluation() {
        return $this->belongsTo(MonthlyEvaluation::class);
    }

    public function category() {
        return $this->belongsTo(KpiCategory::class);
    }

    public function scorer() {
        return $this->belongsTo(User::class);
    }
}
```

Create migration for new table:
```bash
php artisan make:migration create_evaluation_scores_table
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_evaluation_id')->constrained('monthly_evaluations')->onDelete('cascade');
            $table->foreignId('kpi_category_id')->constrained('kpi_categories')->onDelete('cascade');
            $table->string('score_type'); // 'rule_based', 'llm', 'hr', 'supervisor'
            $table->decimal('score', 5, 2); // 0.00 to 10.00
            $table->decimal('confidence', 3, 2)->nullable(); // For LLM
            $table->foreignId('scorer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('remarks')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            // Composite unique to prevent duplicate scores
            $table->unique(['monthly_evaluation_id', 'kpi_category_id', 'score_type']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('evaluation_scores');
    }
};
```

#### Step 3: Update MonthlyEvaluation Model

```php
<?php
namespace App\Models;

class MonthlyEvaluation extends Model {
    protected $fillable = [
        // ... existing
        'rule_based_scores',
        'llm_scores',
        'hr_scores',
        'supervisor_scores',
        'hr_remarks',
        'hr_remarks_by',
        'hr_remarks_at',
        'supervisor_remarks',
        'supervisor_remarks_by',
        'supervisor_remarks_at',
        'final_score_status',
    ];

    protected $casts = [
        // ... existing
        'rule_based_scores' => 'array',
        'llm_scores' => 'array',
        'hr_scores' => 'array',
        'supervisor_scores' => 'array',
        'hr_remarks_at' => 'datetime',
        'supervisor_remarks_at' => 'datetime',
    ];

    public function scores() {
        return $this->hasMany(EvaluationScore::class);
    }

    /**
     * Get all scores for a category
     */
    public function getScoresForCategory($categoryId) {
        return $this->scores()
            ->where('kpi_category_id', $categoryId)
            ->get()
            ->groupBy('score_type')
            ->map(fn($items) => $items->first());
    }

    /**
     * Calculate final score (average of all available scores)
     */
    public function calculateFinalScore() {
        $categoryIds = \App\Models\KpiCategory::pluck('id');
        
        $totalScore = 0;
        $totalCount = 0;
        
        foreach ($categoryIds as $catId) {
            $scores = $this->getScoresForCategory($catId);
            $categoryScores = [];
            
            // Collect all available scores for this category
            if (isset($scores['rule_based'])) {
                $categoryScores[] = $scores['rule_based']->score;
            }
            if (isset($scores['llm'])) {
                $categoryScores[] = $scores['llm']->score;
            }
            if (isset($scores['hr'])) {
                $categoryScores[] = $scores['hr']->score;
            }
            if (isset($scores['supervisor'])) {
                $categoryScores[] = $scores['supervisor']->score;
            }
            
            if (!empty($categoryScores)) {
                $totalScore += array_sum($categoryScores);
                $totalCount += count($categoryScores);
            }
        }
        
        return $totalCount > 0 ? round($totalScore / $totalCount, 2) : 0;
    }

    /**
     * Mark as ready for HR scoring
     */
    public function markReadyForHRScoring() {
        $this->final_score_status = 'pending_hr';
        return $this->save();
    }

    /**
     * Mark as ready for supervisor scoring
     */
    public function markReadyForSupervisorScoring() {
        $this->final_score_status = 'pending_supervisor';
        return $this->save();
    }

    /**
     * Finalize and calculate final score
     */
    public function finalize() {
        $this->final_score = $this->calculateFinalScore();
        $this->final_score_status = 'calculated';
        return $this->save();
    }
}
```

#### Step 4: Create Evaluation Scoring API

Add to `EvaluationController`:

```php
<?php
namespace App\Http\Controllers\Api;

use App\Models\MonthlyEvaluation;
use App\Models\EvaluationScore;

class EvaluationController extends Controller {
    
    /**
     * HR adds scores for an evaluation
     */
    public function submitHRScores(Request $request, MonthlyEvaluation $evaluation) {
        $this->authorize('manageEvaluations');
        
        $validated = $request->validate([
            'scores' => 'required|array',
            'scores.*.category_id' => 'required|exists:kpi_categories,id',
            'scores.*.score' => 'required|numeric|min:0|max:10',
            'remarks' => 'nullable|string',
        ]);
        
        $user = $request->user();
        
        // Create/update scores
        foreach ($validated['scores'] as $scoreData) {
            EvaluationScore::updateOrCreate(
                [
                    'monthly_evaluation_id' => $evaluation->id,
                    'kpi_category_id' => $scoreData['category_id'],
                    'score_type' => 'hr',
                ],
                [
                    'score' => $scoreData['score'],
                    'scorer_id' => $user->id,
                    'remarks' => $validated['remarks'] ?? null,
                ]
            );
        }
        
        // Update evaluation
        $evaluation->hr_scores = collect($validated['scores'])
            ->keyBy('category_id')
            ->map(fn($s) => $s['score'])
            ->toArray();
        $evaluation->hr_remarks = $validated['remarks'];
        $evaluation->hr_remarks_by = $user->id;
        $evaluation->hr_remarks_at = now();
        $evaluation->save();
        
        return response()->json([
            'status' => 'hr_scores_submitted',
            'evaluation' => $evaluation->load('scores'),
        ]);
    }

    /**
     * Supervisor adds scores for an evaluation
     */
    public function submitSupervisorScores(Request $request, MonthlyEvaluation $evaluation) {
        $this->authorize('approveEvaluations');
        
        // Supervisor can only score their own subordinates
        $this->authorize('viewSubordinate', $evaluation->user);
        
        $validated = $request->validate([
            'scores' => 'required|array',
            'scores.*.category_id' => 'required|exists:kpi_categories,id',
            'scores.*.score' => 'required|numeric|min:0|max:10',
            'remarks' => 'nullable|string',
        ]);
        
        $user = $request->user();
        
        // Create/update scores
        foreach ($validated['scores'] as $scoreData) {
            EvaluationScore::updateOrCreate(
                [
                    'monthly_evaluation_id' => $evaluation->id,
                    'kpi_category_id' => $scoreData['category_id'],
                    'score_type' => 'supervisor',
                ],
                [
                    'score' => $scoreData['score'],
                    'scorer_id' => $user->id,
                ]
            );
        }
        
        // Update evaluation
        $evaluation->supervisor_scores = collect($validated['scores'])
            ->keyBy('category_id')
            ->map(fn($s) => $s['score'])
            ->toArray();
        $evaluation->supervisor_remarks = $validated['remarks'];
        $evaluation->supervisor_remarks_by = $user->id;
        $evaluation->supervisor_remarks_at = now();
        $evaluation->save();
        
        return response()->json([
            'status' => 'supervisor_scores_submitted',
            'evaluation' => $evaluation->load('scores'),
        ]);
    }

    /**
     * Finalize evaluation (calculate final score)
     */
    public function finalizeEvaluation(Request $request, MonthlyEvaluation $evaluation) {
        $this->authorize('manageEvaluations');
        
        // Check all scores are submitted
        $scores = $evaluation->scores;
        $hasRuleBased = $scores->where('score_type', 'rule_based')->count() > 0;
        $hasLLM = $scores->where('score_type', 'llm')->count() > 0;
        
        if (!$hasRuleBased || !$hasLLM) {
            return response()->json([
                'error' => 'Cannot finalize: missing rule-based or LLM scores',
            ], 422);
        }
        
        $evaluation->finalize();
        $evaluation->final_score_status = 'approved';
        $evaluation->save();
        
        return response()->json([
            'status' => 'finalized',
            'final_score' => $evaluation->final_score,
            'evaluation' => $evaluation,
        ]);
    }
}
```

Add routes:
```php
Route::post('evaluations/{evaluation}/hr-scores', 
    [EvaluationController::class, 'submitHRScores'])
    ->middleware('can:manageEvaluations');

Route::post('evaluations/{evaluation}/supervisor-scores',
    [EvaluationController::class, 'submitSupervisorScores'])
    ->middleware('can:approveEvaluations');

Route::post('evaluations/{evaluation}/finalize',
    [EvaluationController::class, 'finalizeEvaluation'])
    ->middleware('can:manageEvaluations');
```

#### Step 5: Frontend HR Evaluation Scoring UI

Create `resources/js/pages/EvaluationScoringPage.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EvaluationScoringPage({ evaluationId, scoreType = 'hr' }) {
    const [evaluation, setEvaluation] = useState(null);
    const [categories, setCategories] = useState([]);
    const [scores, setScores] = useState({});
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evalRes, catRes] = await Promise.all([
                    axios.get(`/api/evaluations/${evaluationId}`),
                    axios.get('/api/kpi-categories'),
                ]);
                
                setEvaluation(evalRes.data);
                setCategories(catRes.data.data || catRes.data);
                
                // Initialize scores from existing data
                const existingScores = scoreType === 'hr' 
                    ? evalRes.data.hr_scores 
                    : evalRes.data.supervisor_scores;
                if (existingScores) {
                    setScores(existingScores);
                }
                
                const existingRemarks = scoreType === 'hr'
                    ? evalRes.data.hr_remarks
                    : evalRes.data.supervisor_remarks;
                if (existingRemarks) {
                    setRemarks(existingRemarks);
                }
            } catch (e) {
                console.error('Failed to fetch evaluation', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [evaluationId, scoreType]);

    const handleScoreChange = (categoryId, score) => {
        setScores(prev => ({
            ...prev,
            [categoryId]: Math.min(10, Math.max(0, parseFloat(score) || 0))
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const endpoint = scoreType === 'hr'
                ? `/api/evaluations/${evaluationId}/hr-scores`
                : `/api/evaluations/${evaluationId}/supervisor-scores`;
            
            const scoresList = Object.entries(scores).map(([catId, score]) => ({
                category_id: parseInt(catId),
                score: parseFloat(score),
            }));

            const res = await axios.post(endpoint, {
                scores: scoresList,
                remarks: remarks || null,
            });

            setEvaluation(res.data.evaluation);
            alert(`${scoreType === 'hr' ? 'HR' : 'Supervisor'} scores submitted!`);
        } catch (e) {
            console.error('Failed to save scores', e);
            alert('Error saving scores: ' + (e.response?.data?.message || e.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <header className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {scoreType === 'hr' ? 'HR' : 'Supervisor'} Evaluation Scoring
                </h1>
                <p className="text-slate-500">
                    Employee: <strong>{evaluation?.user?.name}</strong> | 
                    {' '} {evaluation?.month}/{evaluation?.year}
                </p>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800">KPI Category Scores (0-10)</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-6 py-4 font-bold text-slate-700">Category</th>
                                <th className="text-center px-6 py-4 font-bold text-slate-700">Rule-Based</th>
                                <th className="text-center px-6 py-4 font-bold text-slate-700">LLM</th>
                                <th className="text-center px-6 py-4 font-bold text-slate-700">
                                    {scoreType === 'hr' ? 'HR' : 'Supervisor'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {cat.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        {evaluation?.rule_based_scores?.[cat.id]?.toFixed(2) || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        {evaluation?.llm_scores?.[cat.id]?.toFixed(2) || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.5"
                                            value={scores[cat.id] || ''}
                                            onChange={(e) => handleScoreChange(cat.id, e.target.value)}
                                            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold"
                                            placeholder="—"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <label className="block text-sm font-bold text-slate-900 mb-3">
                    {scoreType === 'hr' ? 'HR' : 'Supervisor'} Remarks (Optional)
                </label>
                <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any comments or observations about this evaluation..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="5"
                />
            </div>

            <div className="flex gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                    {saving ? 'Saving...' : 'Submit Scores'}
                </button>
            </div>
        </div>
    );
}
```

---

## Per-User Custom Shift Times

### Problem
Global shift and break times exist in `GlobalSetting`, but employees cannot override with their custom shift times.

### Solution

#### Step 1: Add Columns to Users Table

```php
php artisan make:migration add_custom_shift_to_users
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            // Custom shift times (null = use global defaults)
            $table->time('custom_shift_start')->nullable()->after('work_start_time');
            $table->time('custom_shift_end')->nullable()->after('work_end_time');
            $table->json('custom_breaks')->nullable()->after('custom_shift_end');
            // Format: [{"start": "10:30", "end": "10:50"}, {"start": "13:00", "end": "14:00"}]
        });
    }

    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['custom_shift_start', 'custom_shift_end', 'custom_breaks']);
        });
    }
};
```

#### Step 2: Update User Model

```php
<?php
namespace App\Models;

class User extends Authenticatable {
    protected $fillable = [
        // ... existing
        'custom_shift_start',
        'custom_shift_end',
        'custom_breaks',
    ];

    protected $casts = [
        // ... existing
        'custom_breaks' => 'array',
    ];

    /**
     * Get effective shift start time (custom or global default)
     */
    public function getShiftStart(): string {
        if ($this->custom_shift_start) {
            return $this->custom_shift_start;
        }
        
        $day = now()->isSaturday() ? 'saturday' : 'weekday';
        $setting = GlobalSetting::getByKey("{$day}_shift", ['start' => '08:30']);
        return $setting['start'] ?? '08:30';
    }

    /**
     * Get effective shift end time (custom or global default)
     */
    public function getShiftEnd(): string {
        if ($this->custom_shift_end) {
            return $this->custom_shift_end;
        }
        
        $day = now()->isSaturday() ? 'saturday' : 'weekday';
        $setting = GlobalSetting::getByKey("{$day}_shift", ['end' => '17:30']);
        return $setting['end'] ?? '17:30';
    }

    /**
     * Get effective breaks (custom or global default)
     */
    public function getBreaks(): array {
        if ($this->custom_breaks) {
            return $this->custom_breaks;
        }
        
        $day = now()->isSaturday() ? 'saturday' : 'weekday';
        return GlobalSetting::getByKey("{$day}_breaks", []);
    }

    /**
     * Calculate total break time in minutes
     */
    public function getTotalBreakTime(): int {
        $breaks = $this->getBreaks();
        $totalMinutes = 0;
        
        foreach ($breaks as $break) {
            $start = \Carbon\Carbon::createFromTimeString($break['start']);
            $end = \Carbon\Carbon::createFromTimeString($break['end']);
            $totalMinutes += $end->diffInMinutes($start);
        }
        
        return $totalMinutes;
    }
}
```

#### Step 3: API Endpoint to Update Custom Shift

```php
// In UserController

public function updateCustomShift(Request $request, User $user) {
    $this->authorize('update', $user); // Can only update own or if admin
    
    $validated = $request->validate([
        'shift_start' => 'nullable|date_format:H:i',
        'shift_end' => 'nullable|date_format:H:i',
        'breaks' => 'nullable|array',
        'breaks.*.start' => 'required|date_format:H:i',
        'breaks.*.end' => 'required|date_format:H:i',
    ]);
    
    if (isset($validated['shift_start'])) {
        $user->custom_shift_start = $validated['shift_start'];
    }
    if (isset($validated['shift_end'])) {
        $user->custom_shift_end = $validated['shift_end'];
    }
    if (isset($validated['breaks'])) {
        $user->custom_breaks = $validated['breaks'];
    }
    
    $user->save();
    
    return response()->json([
        'message' => 'Shift settings updated',
        'user' => $user,
    ]);
}
```

Add route:
```php
Route::put('users/{id}/shift-settings', [UserController::class, 'updateCustomShift']);
```

---

## (Continued in next section...)

This document covers the 3 most critical features. See **FEATURE_COMPLETENESS_ANALYSIS.md** for the complete feature matrix and Phase 2-4 priorities.

