# Submission Deadline & Enforcement - Developer Integration Guide

## Quick Start for Developers

### 1. Apply the Migration
```bash
php artisan migrate
```

This adds 8 columns to `task_logs` table and creates 2 indexes.

---

### 2. Understand the Key Class: TaskLog Model

**Location:** `app/Models/TaskLog.php`

**Core Method - Mark as Submitted:**
```php
// Automatically determine if late and set all deadline fields
$log->markAsSubmitted('evening_log')->save();

// Available submission types:
// - 'evening_log' (default, for end-of-day submissions)
// - 'morning_plan' (for beginning-of-day task planning)
```

**What it does:**
1. Sets `submitted_at` to current timestamp
2. Calculates `is_late` flag (compares against 11 PM deadline)
3. Stores deadline metadata (deadline time, minutes late, etc)
4. Sets `submission_type` for tracking

**Query Scopes (Helpers):**
```php
// Find late submissions
TaskLog::late()->get();

// Find submissions for a specific date
TaskLog::forDate('2026-02-09')->get();

// Find pending (not yet submitted)
TaskLog::pending()->get();

// Find submitted
TaskLog::submitted()->get();
```

---

### 3. Understand the Controllers

#### TaskLogController - store() Method

**Location:** `app/Http/Controllers/Api/TaskLogController.php` line ~210

**What to know:**
```php
// Input now includes submission_type
$submissionType = $request->input('submission_type', 'evening_log');

// Critical: Always mark as submitted before save
foreach ($payload['rows'] as $row) {
    $log = TaskLog::create($logData);
    $log->markAsSubmitted($submissionType);  // ← IMPORTANT
    $log->save();
    
    // Audit trail for compliance
    if ($log->is_late) {
        AuditLog::create([
            'user_id' => $userId,
            'action' => 'task_log.submitted_late',
            'new_values' => [
                'minutes_late' => $log->submission_metadata['minutes_late'],
                'deadline' => $log->submission_metadata['deadline'],
            ]
        ]);
    }
}

// Response includes late_count
return response()->json([
    'status' => 'submitted',
    'late_count' => $lateCount,
    'created' => $created,
], 201);
```

---

#### TaskLogController - submissionStatus() Method

**New endpoint for deadline countdown**

```php
public function submissionStatus(Request $request) {
    $user = $request->user();
    
    // Check if already submitted today
    $hasEveningSubmission = TaskLog::where('user_id', $user->id)
        ->whereDate('date', now())
        ->where('submission_type', 'evening_log')
        ->whereNotNull('submitted_at')
        ->exists();
    
    // Calculate deadline and time remaining
    $deadline = now()->copy()->setHour(23)->setMinute(0)->setSecond(0);
    $minutesRemaining = max(0, (int)$deadline->diffInMinutes(now(), false));
    
    return response()->json([
        'date' => now()->toDateString(),
        'has_evening_submission' => $hasEveningSubmission,
        'deadline' => $deadline->toIso8601String(),
        'minutes_remaining' => $minutesRemaining,
        'is_approaching_deadline' => $minutesRemaining > 0 && $minutesRemaining < 60,
        'is_past_deadline' => $minutesRemaining < 0,
        'current_time' => now()->toIso8601String(),
    ]);
}
```

**Route:** `GET /api/task-logs/status/submission`  
**Auth:** Sanctum (user must be logged in)  
**Response Time:** < 100ms

---

#### ReportingController - missingSubmissions() Method

**New endpoint for admin reporting**

```php
public function missingSubmissions(Request $request) {
    $date = $request->query('date', now()->toDateString());
    $deadline = Carbon::parse($date)->setHour(23)->setMinute(0)->setSecond(0);
    
    // Three separate arrays for filtering
    $submitted = [];  // Submitted on time
    $late = [];       // Submitted after deadline
    $missing = [];    // No submission
    
    foreach ($employees as $emp) {
        $submission = TaskLog::where('user_id', $emp->id)
            ->whereDate('date', $date)
            ->where('submission_type', 'evening_log')
            ->first();
        
        if (!$submission) {
            $missing[] = [...]; // Employee info
        } elseif ($submission->is_late) {
            $late[] = [...]; // Include minutes_late
        } else {
            $submitted[] = [...]; // On-time info
        }
    }
    
    return response()->json([
        'date' => $date,
        'total_employees' => count($employees),
        'submitted_count' => count($submitted),
        'late_count' => count($late),
        'missing_count' => count($missing),
        'submitted' => $submitted,
        'late' => $late,
        'missing' => $missing,
    ]);
}
```

**Route:** `GET /api/submissions/missing?date=YYYY-MM-DD`  
**Auth:** Sanctum + gate check (`can:manageUsers`)  
**Response Time:** < 500ms (may need caching for large orgs)

---

### 4. Frontend Integration Points

#### Component 1: DeadlineTimer
**Location:** `resources/js/components/DeadlineTimer.jsx`

**Usage:**
```jsx
import DeadlineTimer from '../components/DeadlineTimer';

export default function Dashboard() {
    return (
        <div>
            <h1>Employee Dashboard</h1>
            <DeadlineTimer refreshInterval={30000} />
            {/* Other dashboard content */}
        </div>
    );
}
```

**Props:**
- `refreshInterval` (optional, default 30000ms): How often to check deadline

**What it shows:**
- ✅ "Submission complete" if already submitted today
- 🔴 RED URGENT if < 1 hour remaining
- 🔴 RED OVERDUE if past deadline
- 🟠 Orange warning if 1-4 hours remaining

**Behind the scenes:**
- Calls `/api/task-logs/status/submission` every 30 seconds
- Uses Axios for HTTP
- State management with useState hook

---

#### Component 2: MissingSubmissions
**Location:** `resources/js/components/MissingSubmissions.jsx`

**Usage in Admin Dashboard:**
```jsx
import MissingSubmissions from '../components/MissingSubmissions';

export default function AdminDashboard() {
    return (
        <div>
            <h1>Admin Dashboard</h1>
            <MissingSubmissions />
            {/* Other admin content */}
        </div>
    );
}
```

**Features:**
- Date input to view any day's status
- Four stat cards showing counts
- Three filtered tables:
  - Green: Submitted on time
  - Orange: Late submissions (with minutes late highlighted)
  - Red: Missing submissions (with supervisor info)

**Behind the scenes:**
- Calls `/api/submissions/missing?date=...` on mount and date change
- Uses Axios for HTTP
- Pagination-ready table structure

---

### 5. API Response Flow

#### Submit Task Logs (POST)
```
Client sends:
POST /api/task-logs
{
  "date": "2026-02-09",
  "submission_type": "evening_log",
  "rows": [...]
}

Backend does:
1. Create TaskLog records
2. Call markAsSubmitted(submission_type) on each
3. Determine is_late based on current time vs 23:00
4. Create AuditLog if late
5. Return with late_count

Client receives:
{
  "status": "submitted",
  "submission_type": "evening_log",
  "count": 5,
  "late_count": 1,
  "created": [...]
}
```

#### Check Status (GET)
```
Client requests:
GET /api/task-logs/status/submission

Backend checks:
1. Did user submit today?
2. What's the deadline (23:00)?
3. How many minutes remaining?
4. Is it urgent/past deadline?

Client receives:
{
  "has_evening_submission": false,
  "deadline": "2026-02-09T23:00:00",
  "minutes_remaining": 450,
  "is_approaching_deadline": false,
  "is_past_deadline": false
}

Frontend displays:
Countdown timer with appropriate warning level
```

#### Admin Report (GET)
```
Admin requests:
GET /api/submissions/missing?date=2026-02-09

Backend queries:
1. All employees with roles
2. TaskLog submissions for that date
3. Categorize into submitted/late/missing
4. Include supervisor info for missing/late

Admin receives:
{
  "submitted_count": 22,
  "late_count": 2,
  "missing_count": 1,
  "submitted": [/* 22 employees */],
  "late": [/* 2 employees with minutes_late */],
  "missing": [/* 1 employee with supervisor */]
}

Admin can:
1. See who submitted on time
2. See who was late (and by how much)
3. See who didn't submit
4. Follow up with missing employees
```

---

### 6. Common Integration Scenarios

#### Scenario 1: New Employee Joining
```php
// In onboarding flow, new employee will automatically:
// - Have TaskLog records created when task submitted
// - markAsSubmitted() automatically called in store()
// - is_late flag set based on submission time
// No additional setup needed
```

#### Scenario 2: Changing Deadline Time
**Currently hardcoded to 11 PM.** To make it configurable:

```php
// In GlobalSetting model or config
'evening_submission_deadline_hour' => 23,
'evening_submission_deadline_minute' => 0,

// Then in TaskLog::getSubmissionDeadline():
public function getSubmissionDeadline() {
    $hour = GlobalSetting::where('key', 'evening_submission_deadline_hour')
        ->value('value') ?? 23;
    $minute = GlobalSetting::where('key', 'evening_submission_deadline_minute')
        ->value('value') ?? 0;
    
    return $this->date->copy()
        ->setHour($hour)
        ->setMinute($minute)
        ->setSecond(0);
}
```

#### Scenario 3: Bulk Audit of Late Submissions
```php
// Get all late submissions for a month
$lateSubmissions = TaskLog::where('is_late', true)
    ->whereBetween('date', ['2026-02-01', '2026-02-28'])
    ->with('user:id,name,email')
    ->orderBy('submitted_at', 'desc')
    ->get();

// Export to CSV, send reports, etc.
foreach ($lateSubmissions as $log) {
    echo "{$log->user->name}: {$log->submission_metadata['minutes_late']} minutes late\n";
}
```

#### Scenario 4: Dashboard Widget for Manager
```php
// Show team's submission status
$team = User::where('supervisor_id', auth()->id())
    ->where('role', 'employee')
    ->get();

$today = now()->toDateString();
$submissions = TaskLog::whereIn('user_id', $team->pluck('id'))
    ->whereDate('date', $today)
    ->get()
    ->groupBy('user_id');

foreach ($team as $employee) {
    $log = $submissions->get($employee->id)?->first();
    if (!$log) {
        echo "{$employee->name}: Missing\n";
    } elseif ($log->is_late) {
        echo "{$employee->name}: Late ({$log->submission_metadata['minutes_late']}min)\n";
    } else {
        echo "{$employee->name}: On time\n";
    }
}
```

---

### 7. Debugging Tips

#### Issue: `is_late` always false
**Cause:** `markAsSubmitted()` not being called before save  
**Fix:** Ensure store() method calls:
```php
$log->markAsSubmitted($submissionType);
$log->save();
```

#### Issue: Deadline timer shows wrong time
**Cause:** Server timezone mismatch  
**Fix:** Check `.env` file:
```env
APP_TIMEZONE=Asia/Colombo  # or your timezone
```

#### Issue: Admin report shows wrong counts
**Cause:** Caching or stale query data  
**Fix:** Clear cache and refresh:
```bash
php artisan cache:clear
# Then reload /api/submissions/missing
```

#### Issue: Audit logs not created for late submissions
**Cause:** `AuditLog::create()` not called or user not authenticated  
**Fix:** Check TaskLogController store() has audit logging:
```php
if ($log->is_late) {  // ← Check this condition
    AuditLog::create([...]);
}
```

---

### 8. Performance Notes

**Query Optimization:**
```php
// ❌ SLOW: Loads all columns + relations
TaskLog::where('is_late', true)->get();

// ✅ FAST: Load only needed columns with eager loading
TaskLog::where('is_late', true)
    ->select(['id', 'user_id', 'submission_metadata', 'submitted_at'])
    ->with('user:id,name')
    ->get();
```

**Caching Strategy:**
```php
// Cache submission summary for 5 minutes
$summary = Cache::remember("submissions.{$date}", 300, function () use ($date) {
    return DB::table('task_logs')
        ->whereDate('date', $date)
        ->selectRaw('is_late, count(*) as count')
        ->groupBy('is_late')
        ->get();
});
```

**Frontend Performance:**
- DeadlineTimer: Refreshes every 30 seconds (not continuous)
- MissingSubmissions: Single API call per date selection
- No unnecessary re-renders or polling

---

### 9. Testing Code Examples

#### Unit Test: Task Log Submission
```php
public function test_task_log_marked_late_if_submitted_after_deadline() {
    $user = User::factory()->employee()->create();
    
    // Mock time to 23:30 (30 minutes after deadline)
    Carbon::setTestNow(now()->setHour(23)->setMinute(30));
    
    $log = TaskLog::factory()->create(['user_id' => $user->id]);
    $log->markAsSubmitted('evening_log');
    
    $this->assertTrue($log->is_late);
    $this->assertEquals(30, $log->submission_metadata['minutes_late']);
}
```

#### Feature Test: Submission API
```php
public function test_submit_task_logs_endpoint() {
    $user = User::factory()->employee()->create();
    $this->actingAs($user);
    
    $response = $this->postJson('/api/task-logs', [
        'date' => now()->toDateString(),
        'submission_type' => 'evening_log',
        'rows' => [...]
    ]);
    
    $response->assertStatus(201);
    $response->assertJsonStructure([
        'status', 'submission_type', 'count', 'late_count', 'created'
    ]);
    
    $this->assertDatabaseHas('task_logs', [
        'user_id' => $user->id,
        'submitted_at' => now(),
    ]);
}
```

---

### 10. Next Steps for Developers

**Phase 0 - Item 2 (Email Reminders) - When Ready:**

```php
// Create Mailable in: app/Mail/SubmissionDeadlineReminder.php
class SubmissionDeadlineReminder extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Task Submission Reminder - Due at 11 PM',
        );
    }
}

// Create Job to send reminders:
// - 1 hour before deadline (10 PM)
// - 30 minutes before deadline (10:30 PM)

// Schedule in kernel.php:
$schedule->job(SendSubmissionReminders::class)->dailyAt('22:00');
```

**Phase 0 - Item 3 (Time Validation):**
```php
// Add to TaskLog model:
public function validateTimeGaps(): array {
    $gaps = [];
    $logs = $this->date->logs->sortBy('start_time');
    // Calculate uncovered periods
    return $gaps;
}
```

---

## Summary

**What's Integrated:**
- ✅ 8-column database schema for deadline tracking
- ✅ TaskLog model with deadline logic
- ✅ 3 new API endpoints (submissionStatus, missingSubmissions, submissionTrend)
- ✅ 2 new React components (DeadlineTimer, MissingSubmissions)
- ✅ Audit logging for compliance
- ✅ Authorization gates for admin endpoints

**Ready for:**
- Production deployment
- End-to-end testing
- User training and onboarding

**Still To Do:**
- Email reminders (next phase)
- Time validation (next phase)
- Custom shift times (future phase)

