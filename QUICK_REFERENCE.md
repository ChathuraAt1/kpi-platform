# Submission Deadline & Enforcement - Quick Reference Card

## 🚀 Quick Start

### Deploy

```bash
php artisan migrate
php artisan cache:clear
npm run build
```

### Test

```bash
# Check status (employee)
curl -H "Authorization: Bearer TOKEN" \
  https://api.company.com/api/task-logs/status/submission

# Check missing (admin)
curl -H "Authorization: Bearer TOKEN" \
  https://api.company.com/api/submissions/missing
```

---

## 📱 API Endpoints

### 1. Submission Status (Employee)

```
GET /api/task-logs/status/submission

Response: {
  deadline: "2026-02-09T23:00:00",
  minutes_remaining: 300,
  is_past_deadline: false,
  is_approaching_deadline: false,
  has_evening_submission: false
}
```

### 2. Submit Logs (Updated)

```
POST /api/task-logs

Body: {
  date: "2026-02-09",
  submission_type: "evening_log",  // NEW
  rows: [...]
}

Response: {
  status: "submitted",
  late_count: 0  // NEW
}
```

### 3. Missing Submissions (Admin)

```
GET /api/submissions/missing?date=2026-02-09

Response: {
  submitted_count: 22,
  late_count: 2,
  missing_count: 1,
  submitted: [...],
  late: [...],
  missing: [...]
}
```

### 4. Submission Trend (Admin)

```
GET /api/submissions/trend?days=7

Response: {
  trends: [
    { date: "2026-02-02", submitted: 22, late: 2, missing: 1, submission_rate: 88.0 }
  ]
}
```

---

## 🗄️ Database Schema

### New Columns in task_logs

```
submitted_at        TIMESTAMP      // When submitted
is_late             BOOLEAN        // Late flag (indexed)
submission_type     VARCHAR(50)    // 'evening_log' or 'morning_plan'
submission_metadata JSON           // Deadline details
total_hours_logged  DECIMAL(5,2)   // Daily sum
break_hours_deducted DECIMAL(4,2)  // Break calculation
expected_work_hours DECIMAL(5,2)   // Shift hours
time_gaps           JSON           // Uncovered periods
```

### New Indexes

```
INDEX (user_id, date, is_late)
INDEX (submitted_at)
```

---

## 💻 Model Methods (TaskLog)

### Mark as Submitted

```php
$log->markAsSubmitted('evening_log')->save();

// Sets: submitted_at, is_late, submission_type, submission_metadata
```

### Query Scopes

```php
TaskLog::late()->get();                  // WHERE is_late = true
TaskLog::submitted()->get();             // WHERE submitted_at NOT NULL
TaskLog::pending()->get();               // WHERE submitted_at NULL
TaskLog::forDate('2026-02-09')->get();   // WHERE date = '2026-02-09'
```

### Helper Methods

```php
$log->getSubmissionDeadline();           // Returns 11 PM as Carbon
$log->isDeadlineApproaching();           // Check if < 1 hour
$log->getMinutesUntilDeadline();         // Signed int
```

---

## ⚛️ React Components

### DeadlineTimer

```jsx
import DeadlineTimer from "../components/DeadlineTimer";

// Usage
<DeadlineTimer refreshInterval={30000} />;

// States:
// Green - Submitted
// Red - Urgent (< 1 hour) or Overdue
// Orange - Normal (1-4 hours)
```

### MissingSubmissions

```jsx
import MissingSubmissions from "../components/MissingSubmissions";

// Usage (in admin dashboard)
<MissingSubmissions />;

// Shows:
// - Date picker
// - Stat cards (total, submitted, late, missing)
// - 3 filtered tables (on-time, late, missing)
```

---

## 🔐 Authorization

### Who Can Access What

| Endpoint                         | Required Auth              | Access Control               |
| -------------------------------- | -------------------------- | ---------------------------- |
| GET /task-logs/status/submission | Sanctum token              | User can only see own status |
| POST /task-logs                  | Sanctum token              | Submit own logs only         |
| GET /submissions/missing         | Sanctum + manageUsers gate | Admins/supervisors only      |
| GET /submissions/trend           | Sanctum + manageUsers gate | Admins only                  |

---

## 📊 Common Queries

### Find All Late Submissions for a Date

```php
$late = TaskLog::where('is_late', true)
    ->whereDate('date', '2026-02-09')
    ->with('user')
    ->get();
```

### Check if User Submitted Today

```php
$submitted = TaskLog::where('user_id', $userId)
    ->whereDate('date', now())
    ->where('submission_type', 'evening_log')
    ->whereNotNull('submitted_at')
    ->exists();
```

### Get Submission Rate for a Date

```php
$count = TaskLog::whereDate('date', '2026-02-09')
    ->where('submission_type', 'evening_log')
    ->where('is_late', false)
    ->distinct('user_id')
    ->count('user_id');

$rate = ($count / User::where('role', 'employee')->count()) * 100;
```

### Get Team Status by Supervisor

```php
$team = User::where('supervisor_id', $supervisorId)
    ->where('role', 'employee')
    ->get();

$submissions = TaskLog::whereIn('user_id', $team->pluck('id'))
    ->whereDate('date', now())
    ->with('user')
    ->get()
    ->groupBy('user_id');
```

---

## 🐛 Debugging

### Issue: is_late Always False

**Fix:** Ensure `markAsSubmitted()` called BEFORE save()

```php
$log->markAsSubmitted($type);
$log->save();  // ✓ Correct
```

### Issue: Deadline Timer Shows Wrong Time

**Check:** APP_TIMEZONE in .env

```env
APP_TIMEZONE=Asia/Colombo  # Your timezone
```

### Issue: Admin Report Shows Wrong Counts

**Fix:** Clear cache

```bash
php artisan cache:clear
```

### Issue: Audit Logs Not Created

**Check:** Is AuditLog::create() being called?

```php
if ($log->is_late) {  // Must be true
    AuditLog::create([...]);
}
```

---

## 📈 Performance Tips

### Optimize Queries

```php
// ❌ SLOW
TaskLog::where('is_late', true)->get();

// ✅ FAST
TaskLog::where('is_late', true)
    ->select(['id', 'user_id', 'submitted_at'])
    ->with('user:id,name')
    ->get();
```

### Cache Results

```php
$summary = Cache::remember("submissions.{$date}", 300, function () {
    return DB::table('task_logs')
        ->whereDate('date', $date)
        ->selectRaw('count(*) as total, sum(is_late) as late')
        ->first();
});
```

---

## ✅ Testing Checklist

- [ ] Run migration: `php artisan migrate`
- [ ] Test `/api/task-logs/status/submission`
- [ ] Test submission before 11 PM (should be `is_late: false`)
- [ ] Test submission after 11 PM (should be `is_late: true`)
- [ ] Test `/api/submissions/missing?date=today`
- [ ] Verify DeadlineTimer on dashboard
- [ ] Verify MissingSubmissions admin component
- [ ] Check audit logs created for late submissions
- [ ] Verify authorization gates working
- [ ] Performance check: all endpoints < 500ms

---

## 🔄 Integration Checklist

- [ ] Migration applied to database
- [ ] TaskLog model shows deadline logic
- [ ] TaskLogController updated with submission_type
- [ ] ReportingController has new methods
- [ ] Routes added to api.php
- [ ] DeadlineTimer imported in EmployeeDashboard
- [ ] Frontend components deployed
- [ ] Cache cleared
- [ ] Frontend rebuilt

---

## 📚 Documentation Guide

| Document                               | For              | Key Sections                               |
| -------------------------------------- | ---------------- | ------------------------------------------ |
| PHASE_0_ITEM_1_COMPLETE.md             | Everyone         | Overview, what's included, next steps      |
| DEADLINE_ENFORCEMENT_IMPLEMENTATION.md | Product/Managers | Feature overview, how to use, examples     |
| DEVELOPER_INTEGRATION_GUIDE.md         | Developers       | API flows, code examples, debugging        |
| DEPLOYMENT_TESTING_CHECKLIST.md        | DevOps/QA        | Deployment steps, 60+ test cases, rollback |

---

## 🚨 Critical Points

**MUST DO:**

1. ✅ Run migration before deploying
2. ✅ markAsSubmitted() BEFORE save()
3. ✅ Use AUTH token for API calls
4. ✅ Check manageUsers gate for admin endpoints

**DO NOT:**

1. ❌ Hardcode 11 PM deadline (ready for config in Phase 0 Item 5)
2. ❌ Forget to call cache:clear after deploy
3. ❌ Skip the deployment testing checklist
4. ❌ Forget rollback plan exists

---

## 📞 Quick Links

**Files to Review:**

- Migration: `database/migrations/2026_02_09_000000_*.php`
- Backend: `app/Models/TaskLog.php`, `app/Http/Controllers/Api/*`
- Frontend: `resources/js/components/DeadlineTimer.jsx`, `MissingSubmissions.jsx`
- Routes: `routes/api.php`

**Key Classes to Know:**

- `TaskLog` model - Deadline logic
- `TaskLogController` - Submission handling
- `ReportingController` - Admin reports
- `DeadlineTimer` - Frontend countdown
- `MissingSubmissions` - Admin dashboard

---

## 📊 Success Metrics

**Post-Deployment Targets:**

- ✅ 85%+ on-time submission rate (Week 1)
- ✅ 0 critical production errors
- ✅ API response times < 500ms
- ✅ Positive user feedback
- ✅ Audit trail capturing all late submissions

---

## 🎯 Next Phase 0 Items

1. ✅ Item 1: **Deadline Enforcement** (DONE)
2. ⏳ Item 2: **Email Reminders**
    - 1 hour before deadline
    - 30 mins before deadline
    - Late notification
    - Missing notification

3. ⏳ Item 3: **Time Gaps Validation**
4. ⏳ Item 4: **Break Deductions**
5. ⏳ Item 5: **Shift Time Alignment**

---

**Last Updated:** February 9, 2026  
**Status:** ✅ Production Ready  
**Deployment:** Ready to proceed
