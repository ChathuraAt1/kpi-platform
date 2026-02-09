# Submission Deadline & Enforcement - Deployment & Testing Checklist

**Feature:** Phase 0 Critical - Submission Deadline Enforcement  
**Status:** Implementation Complete ✅  
**Date:** February 9, 2026

---

## Pre-Deployment Checklist

### Code Review

- [ ] Review migration file `2026_02_09_000000_add_submission_deadline_tracking_to_task_logs.php`
- [ ] Review TaskLog model changes (markAsSubmitted, getSubmissionDeadline methods)
- [ ] Review TaskLogController store() and submissionStatus() methods
- [ ] Review ReportingController missingSubmissions() and submissionTrend() methods
- [ ] Review routes added to routes/api.php
- [ ] Review DeadlineTimer.jsx component (state, effects, conditional rendering)
- [ ] Review MissingSubmissions.jsx component (date filtering, tables)
- [ ] Check that EmployeeDashboard imports DeadlineTimer component

### Database Preparation

- [ ] Backup production database (`mysqldump -u user -p database > backup.sql`)
- [ ] Test migration in staging environment
- [ ] Verify no data loss in migration rollback test
- [ ] Confirm table structure after migration

### Dependencies Check

- [ ] Confirm Laravel version supports migration syntax (Laravel 12+)
- [ ] Confirm Sanctum is installed (for auth middleware)
- [ ] Confirm Axios is available in frontend
- [ ] Confirm Tailwind CSS is configured (for component styling)
- [ ] Check Carbon library available (for date calculations)

---

## Deployment Steps

### Step 1: Database Migration (⏱️ ~2 minutes)

```bash
# In production environment:
php artisan migrate --force

# Verify the migration ran
php artisan migrate:status | grep "add_submission_deadline"

# Expected output:
# 2026_02_09_000000_add_submission_deadline_tracking_to_task_logs ... Migrated
```

**Rollback Plan:**

```bash
php artisan migrate:rollback --force  # Only if critical issue found
```

### Step 2: Clear Application Cache

```bash
php artisan cache:clear
php artisan config:cache
php artisan view:cache
```

### Step 3: Frontend Assets

```bash
# Build frontend with updated components
npm run build

# If using Vite:
npm run prod  # For production
```

### Step 4: Queue Jobs (if using email reminders later)

```bash
# Start queue worker
php artisan queue:work --queue=default,llm --delay=0
```

**Note:** Not required for Phase 0 deadline enforcement, but prepare for Phase 0 Item 2.

### Step 5: Verify Deployment

```bash
# Check application is running
curl -H "Authorization: Bearer{TEST_TOKEN}" \
  https://your-api.com/api/task-logs/status/submission

# Expected response: JSON with deadline info
```

---

## Testing Checklist

### A. Database Tests

#### Test 1: Migration Successful

```bash
# Check table structure
DESCRIBE task_logs;

# Expected new columns:
# - submitted_at: TIMESTAMP NULL
# - is_late: TINYINT(1) DEFAULT 0
# - submission_type: VARCHAR(50)
# - submission_metadata: JSON
# - total_hours_logged: DECIMAL(5,2)
# - break_hours_deducted: DECIMAL(4,2)
# - expected_work_hours: DECIMAL(5,2)
# - time_gaps: JSON
```

#### Test 2: Indexes Created

```bash
# Check indexes exist
SHOW INDEX FROM task_logs;

# Expected indexes:
# - (user_id, date, is_late)
# - (submitted_at)
```

#### Test 3: Data Integrity

```bash
# Verify no data loss for existing rows
SELECT COUNT(*) FROM task_logs;   # Should match count before migration
SELECT COUNT(*) FROM users;       # Unaffected
SELECT COUNT(*) FROM tasks;       # Unaffected
```

---

### B. API Endpoint Tests

#### Test 1: Get Submission Status

```bash
# Request
curl -X GET "https://api.company.com/api/task-logs/status/submission" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response (Status 200)
{
  "date": "2026-02-09",
  "has_morning_submission": false,
  "has_evening_submission": false,
  "deadline": "2026-02-09T23:00:00+05:30",
  "minutes_remaining": 300,
  "is_approaching_deadline": false,
  "is_past_deadline": false,
  "current_time": "2026-02-09T18:00:00+05:30"
}
```

**Test Cases:**

- [ ] Valid user returns correct status
- [ ] Missing auth token returns 401 Unauthorized
- [ ] Endpoint responds in < 100ms
- [ ] Submission status accurate (changes immediately after submit)

#### Test 2: Submit Task Logs (Updated)

```bash
# Request with submission_type
curl -X POST "https://api.company.com/api/task-logs" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-09",
    "submission_type": "evening_log",
    "rows": [{
      "task_id": 1,
      "start_time": "09:00:00",
      "end_time": "10:30:00",
      "duration_hours": 1.5,
      "description": "Development work"
    }]
  }'

# Expected Response (Status 201)
{
  "status": "submitted",
  "submission_type": "evening_log",
  "count": 1,
  "late_count": 0,
  "created": [
    {
      "id": 123,
      "task_id": 1,
      "user_id": 1,
      "submitted_at": "2026-02-09T18:00:00",
      "is_late": false,
      "submission_type": "evening_log"
    }
  ]
}
```

**Test Cases:**

- [ ] Submission before 11 PM: `is_late` = false
- [ ] Submission after 11 PM: `is_late` = true
- [ ] Response includes `late_count`
- [ ] `submission_type` is stored correctly
- [ ] `submitted_at` timestamp is accurate

#### Test 3: Get Missing Submissions (Admin)

```bash
# Request with date parameter
curl -X GET "https://api.company.com/api/submissions/missing?date=2026-02-09" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Expected Response (Status 200)
{
  "date": "2026-02-09",
  "deadline": "2026-02-09T23:00:00+05:30",
  "total_employees": 25,
  "submitted_count": 22,
  "late_count": 2,
  "missing_count": 1,
  "submitted": [
    {
      "user_id": 1,
      "name": "John Doe",
      "submitted_at": "2026-02-09T18:00:00",
      "submission_type": "evening_log"
    }
    // ... 21 more
  ],
  "late": [
    {
      "user_id": 2,
      "name": "Jane Smith",
      "email": "jane@company.com",
      "supervisor_name": "Bob Manager",
      "submitted_at": "2026-02-09T23:45:00",
      "deadline": "2026-02-09T23:00:00",
      "minutes_late": 45
    }
    // ... 1 more
  ],
  "missing": [
    {
      "user_id": 3,
      "name": "Alice Johnson",
      "email": "alice@company.com",
      "supervisor_name": "Bob Manager",
      "supervisor_id": 4
    }
  ]
}
```

**Test Cases:**

- [ ] Endpoint requires admin authorization (manageUsers gate)
- [ ] Counts accurate (total = submitted + late + missing)
- [ ] Each section has correct employee data
- [ ] Date parameter works (test past dates)
- [ ] Response in < 500ms
- [ ] Missing employees show supervisor info

#### Test 4: Get Submission Trends (Admin)

```bash
# Request with days parameter
curl -X GET "https://api.company.com/api/submissions/trend?days=7" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Expected Response (Status 200)
{
  "period": "2026-02-02 to 2026-02-09",
  "trends": [
    {
      "date": "2026-02-02",
      "total_employees": 25,
      "submitted": 22,
      "late": 2,
      "missing": 1,
      "submission_rate": 88.0
    },
    {
      "date": "2026-02-03",
      "total_employees": 25,
      "submitted": 23,
      "late": 1,
      "missing": 1,
      "submission_rate": 92.0
    }
    // ... 5 more days
  ]
}
```

**Test Cases:**

- [ ] Returns 7 days of data by default
- [ ] Submission rate calculated correctly: `(submitted / total) * 100`
- [ ] Days in chronological order
- [ ] Works for different date ranges

---

### C. Frontend Component Tests

#### Test 1: DeadlineTimer Component Rendering

**Test Case 1a: Before Deadline (4 hours remaining)**

```
Expected Display:
[🟠 Orange Box]
"Daily Submission Deadline: 11:00 PM"
"240 minutes remaining"

Expected Behavior:
- Refreshes every 30 seconds
- Green checkmark if submitted
- No animation
```

- [ ] Component renders correctly
- [ ] Timer text matches expected format
- [ ] Color is orange (not red)
- [ ] No pulsing animation

**Test Case 1b: Approaching Deadline (45 minutes remaining)**

```
Expected Display:
[🔴 Red Box]
"URGENT: Your daily submission is due soon!"
"45 minutes remaining"

Expected Behavior:
- Orange/red coloring
- May include animated warning icon
```

- [ ] Color changes to red
- [ ] Text changes to URGENT
- [ ] Still refreshes every 30 seconds

**Test Case 1c: After Deadline Passed**

```
Expected Display:
[🔴 Red Box - Pulsing]
"⚠️ Deadline Exceeded"
"Your submission is 15 minutes overdue"

Expected Behavior:
- Red background with pulse animation
- Shows how many minutes late
- Prompts immediate submission
```

- [ ] Color red with pulse animation
- [ ] Shows minutes late (with minus sign or "overdue" text)
- [ ] Still has submit button/link

**Test Case 1d: Already Submitted**

```
Expected Display:
[🟢 Green Box]
"✅ Daily Submission Complete"
"Thank you for submitting on time!"

Expected Behavior:
- Green background
- Checkmark icon
- Positive message
- No countdown timer
```

- [ ] Color green
- [ ] Checkmark icon displays
- [ ] Timer hidden
- [ ] Submitted time shown

**Test Case 1e: Mobile Responsiveness**

- [ ] Component displays correctly on mobile (< 600px width)
- [ ] Text is readable (font size 16px minimum)
- [ ] Colors visible on all backgrounds
- [ ] Touch targets at least 44px (if interactive)

#### Test 2: MissingSubmissions Component Rendering

**Test Case 2a: Full View (Mixed Status)**

```
Expected Display:
[Date Picker showing today's date]
[4 Stat Cards]
- Total: 25 employees
- ✅ Submitted: 22 (88%)
- ⏰ Late: 2 (8%)
- ❌ Missing: 1 (4%)

[3 Tables]
- Table 1 (Green): "Submitted On Time" with 22 rows
- Table 2 (Orange): "Late Submissions" with 2 rows (showing minutes late)
- Table 3 (Red): "Missing" with 1 row
```

- [ ] All stat cards show correct counts
- [ ] Counts add up to total
- [ ] Percentages calculated correctly
- [ ] All employees visible in their respective tables
- [ ] Color coding matches spec (green/orange/red)

**Test Case 2b: Empty State (100% Submitted)**

```
Expected Display:
[Congratulations message]
"All submissions complete! 🎉"
"25/25 employees submitted on time"
[No red/orange sections visible]
```

- [ ] Message appears when missing_count = 0 and late_count = 0
- [ ] Stat cards still show (but with all green)
- [ ] No tables for late/missing

**Test Case 2c: Date Picker Functionality**

```
Test Cases:
1. Today's date selected by default
2. Click date input
3. Select past date (e.g., 5 days ago)
4. Component re-fetches data for that date
5. All counts/tables update
```

- [ ] Date input shows today by default
- [ ] Can select past dates
- [ ] Data refreshes when date changes
- [ ] Cannot select future dates (optional validation)

**Test Case 2d: Table Details**

**Submitted Table:**

- [ ] Columns: Employee Name, Submitted At, Submission Type
- [ ] Shows correct submission timestamps
- [ ] Timestamps in readable format (e.g., "5:30 PM")

**Late Table:**

- [ ] Columns: Employee Name, Supervisor, Submitted At, Minutes Late
- [ ] Minutes late highlighted in orange or red
- [ ] Supervisor name shown correctly
- [ ] Ordered by minutes_late descending (most late first)

**Missing Table:**

- [ ] Columns: Employee Name, Supervisor, Email
- [ ] Email shown correctly
- [ ] Supervisor name shown correctly
- [ ] Includes checkbox for bulk actions (select multiple to notify)

**Test Case 2e: Mobile Responsiveness**

- [ ] Stat cards stack vertically on mobile
- [ ] Tables horizontal scroll or collapse to card view
- [ ] Date picker takes full width
- [ ] All text readable without zoom

**Test Case 2f: Integration with Backend**

- [ ] Component fetches from `/api/submissions/missing?date=...`
- [ ] Loading state shown while fetching
- [ ] Error message if API fails
- [ ] Data updates when tab regains focus (optional)

---

### D. Integration Tests

#### Test 1: End-to-End Submission Flow

```
Scenario: Employee submits task logs before deadline

Steps:
1. Employee logs in to dashboard
2. Employee sees DeadlineTimer component showing "4 hours remaining"
3. Employee navigates to submit log page
4. Employee submits: POST /api/task-logs with submission_type='evening_log'
5. Backend:
   - Creates TaskLog record
   - Calls markAsSubmitted('evening_log')
   - Sets submitted_at = now()
   - Calculates is_late = false (before 11 PM)
   - Saves record
   - Returns 201 with late_count: 0
6. Frontend:
   - Shows success message
   - Refreshes DeadlineTimer
7. DeadlineTimer now shows:
   - ✅ Green "Submission Complete"
   - No countdown
8. Admin views /api/submissions/missing
   - Employee now in "submitted" array
   - Moved from "missing" array

Expected Duration: < 5 seconds total
```

- [ ] Submission accepted (201 status)
- [ ] TaskLog record created in DB
- [ ] submitted_at timestamp set
- [ ] is_late flag = false
- [ ] DeadlineTimer updates immediately
- [ ] Admin report updated
- [ ] No error messages

#### Test 2: End-to-End Late Submission Flow

```
Scenario: Employee submits task logs after 11 PM

Setup: Mock time to 23:45

Steps:
1. Late submission POST /api/task-logs
2. Backend:
   - Gets current time (23:45)
   - Deadline = 23:00
   - Calculates minutes_late = 45
   - Sets is_late = true
   - Creates AuditLog entry
3. Frontend receives:
   - late_count: 1
   - Success message (accepted but marked late)
4. Admin checks /api/submissions/missing
   - Employee in "late" array
   - Shows "45 minutes late"
5. AuditLog shows:
   - action: 'task_log.submitted_late'
   - user_id: employee_id
   - minutes_late: 45

Expected Duration: < 5 seconds total
```

- [ ] Submission accepted (201 status)
- [ ] is_late flag = true
- [ ] submission_metadata stores minutes_late
- [ ] AuditLog created with action 'task_log.submitted_late'
- [ ] Admin report shows in "late" array
- [ ] DeadlineTimer shows red urgent status (if checked before submission timeout)

#### Test 3: Admin Authorization

**Test Case 3a: User Without Authorization**

```
Request: GET /api/submissions/missing (as regular employee)

Expected Response:
Status: 403 Forbidden
{
  "message": "This action is unauthorized."
}
```

- [ ] Regular employees get 403
- [ ] Supervisors need specific gate check
- [ ] Only admins/users with manageUsers gate can access

**Test Case 3b: User With Authorization**

```
Request: GET /api/submissions/missing (as admin)

Expected Response:
Status: 200 OK
[Full report data]
```

- [ ] Admins get full report
- [ ] Minimal delay (< 500ms)

---

### E. Edge Case Tests

#### Edge Case 1: Timezone Handling

```
Test: Submission near midnight with different timezones

Setup:
- Server: Asia/Colombo (UTC+5:30)
- User: New York (UTC-5)
- User submits at 23:00 New York time
- Server time: 08:30 next day

Expected:
- Deadline calculated in server timezone
- Submission time recorded in UTC
- is_late correctly compared
```

- [ ] Timezone mismatch handled correctly
- [ ] All times store in UTC in database
- [ ] Conversion back to user timezone for display

#### Edge Case 2: Daylight Saving Time

```
Test: Submission during DST transition

Setup: Transition date with 11 PM deadline

Expected:
- Deadline still 11 PM local time
- No double-counting of submissions
```

- [ ] No off-by-one hour errors
- [ ] DST handled gracefully

#### Edge Case 3: Bulk Submissions

```
Test: Admin bulk-creating task logs for multiple users

Setup:
- Create 100 task logs at once
- Mix of on-time and late submissions

Expected:
- All marked as submitted
- Late flags correctly set
- All audit logs created
- Response time < 2 seconds
```

- [ ] Bulk operations handle correctly
- [ ] No database deadlocks
- [ ] Queries use batch operations

#### Edge Case 4: Concurrent Submissions

```
Test: Two users submitting simultaneously

Setup:
- User A submits at 23:00:00
- User B submits at 23:00:01
- Both just before 23:00:05

Expected:
- Both marked as submitted
- Both have is_late = false
- Both have accurate submitted_at times
```

- [ ] No race conditions
- [ ] Timestamps accurate to second
- [ ] No locking issues

#### Edge Case 5: Missing User/Task Data

```
Test: Submit log for deleted user/task

Setup:
- User deleted after log created
- Task deleted after log created

Expected:
- Foreign key constraints prevent deletion OR
- Soft deletes allow retrieval OR
- Graceful handling in reports
```

- [ ] No orphaned records
- [ ] Reports handle missing data
- [ ] No 500 errors

---

### F. Performance Tests

#### Performance Test 1: API Response Times

```
Baseline Requirements:
- GET /api/task-logs/status/submission: < 100ms
- GET /api/submissions/missing (100 employees): < 500ms
- GET /api/submissions/trend (30 days): < 800ms
- POST /api/task-logs (50 records): < 2 seconds
```

**Test Method:**

```bash
# Time 100 requests
for i in {1..100}; do
  time curl -X GET "https://api.company.com/api/task-logs/status/submission" \
    -H "Authorization: Bearer TOKEN"
done

# Analyze: Average, P95, P99 latencies
```

- [ ] submission status: 90-100ms
- [ ] missing report: 300-400ms
- [ ] trends: 600-700ms
- [ ] storage: 1.5-1.8 seconds

#### Performance Test 2: Frontend Component Load

```
Baseline Requirements:
- DeadlineTimer renders: < 50ms
- DeadlineTimer first API call: < 100ms
- MissingSubmissions renders: < 100ms
- MissingSubmissions first API call: < 500ms
```

**Test Method:** Use Chrome DevTools Performance tab

- [ ] First Contentful Paint (FCP) < 100ms
- [ ] Time to Interactive (TTI) < 200ms
- [ ] Component updates < 50ms on state change

#### Performance Test 3: Database Query Performance

```sql
-- Query: Find all late submissions for a date (should use index)
EXPLAIN SELECT * FROM task_logs
WHERE is_late = 1 AND DATE(date) = '2026-02-09'
AND user_id IN (SELECT id FROM users WHERE role = 'employee');

-- Expected: Uses index on (user_id, date, is_late)
-- Expected: < 100ms for 1000 records
```

- [ ] Queries use indexes (EXPLAIN shows index usage)
- [ ] No full table scans
- [ ] Response time < 100ms for typical data size

---

### G. Security Tests

#### Security Test 1: Authorization

```
Test: Endpoint requires proper authorization

Cases:
1. No token → 401 Unauthorized
2. Invalid token → 401 Unauthorized
3. Valid token, wrong gate → 403 Forbidden
4. Valid token, correct gate → 200 OK
```

- [ ] task-logs endpoints require is_authenticated
- [ ] submissions/missing requires manageUsers gate
- [ ] submissions/trend requires manageUsers gate

#### Security Test 2: SQL Injection

```
Test: Malicious input in date parameter

Request: GET /api/submissions/missing?date=2026-02-09' OR '1'='1

Expected: Safely handled (parameterized query)
- No SQL error
- Returns empty or specific error message
- No database error details exposed
```

- [ ] All inputs sanitized
- [ ] Parameterized queries used
- [ ] No error details in response

#### Security Test 3: Data Exposure

```
Test: User A cannot see User B's submission status

Setup:
- Create User A (employee, auth token)
- Create User B (employee, different token)
- User A calls GET /api/task-logs/status/submission

Expected:
- Returns only User A's data
- Cannot see User B's deadline status
```

- [ ] Endpoints filter by `auth()->user()->id`
- [ ] No data leakage between users
- [ ] Supervisor can only see their subordinates (if implemented)

---

## Post-Deployment Testing

### Week 1 Monitoring

- [ ] Monitor error logs: `tail -f storage/logs/laravel.log`
- [ ] Check database performance: `SHOW PROCESSLIST;`
- [ ] Review audit logs for any anomalies
- [ ] Gather user feedback on deadline timer UX
- [ ] Monitor admin report usage

### Metrics to Track

```
Daily Metrics:
- Total submissions: ___
- Late submissions: ___ (percentage: __%)
- Missing submissions: ___ (percentage: __%)
- Average submission time: ___
- Peak submission time: ___

Weekly Metrics:
- Submission trend: ↑ ↓ →
- System response times: < 500ms?
- Error rate: < 0.1%?
- User complaints/feedback: ___
```

### Feedback Collection

- [ ] Email survey to employees: "Was deadline timer helpful?"
- [ ] Email survey to supervisors: "Is admin report useful?"
- [ ] Monitor support tickets for deadline-related issues
- [ ] Collect metrics on engagement with new components

---

## Rollback Plan (If Critical Issues Found)

### Option A: Quick Rollback (< 5 minutes downtime)

```bash
# Undo migration
php artisan migrate:rollback --force

# Clear cache
php artisan cache:clear

# Revert code changes
git revert HEAD~1  # Roll back last commit

# Clear frontend static assets
rm -rf public/build && npm run build

# Restart application
php artisan tinker  # Or restart web server
```

**Issues that trigger rollback:**

- Database migration fails (< 1% chance with tested migration)
- API endpoints return 500 errors in production
- Submitted task logs not being saved correctly
- Security vulnerability discovered

### Option B: Gradual Rollout (If available)

```
1. Deploy to 10% of users first (via feature flag)
2. Monitor for 1 hour
3. If no issues, deploy to 50%
4. Monitor for 2 hours
5. If still good, deploy to 100%
6. If issues found, blue/green switch back to previous version
```

---

## Sign-Off Checklist

### Development Team

- [ ] Code reviewed by 2 developers
- [ ] All tests passing
- [ ] No linting errors
- [ ] Migration tested in staging

### QA Team

- [ ] All test cases passed
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Edge cases handled

### Product Team

- [ ] Feature meets requirements
- [ ] UX acceptable to stakeholders
- [ ] Documentation complete
- [ ] Training materials prepared

### Operations Team

- [ ] Deployment plan reviewed
- [ ] Monitoring configured
- [ ] On-call team briefed
- [ ] Rollback plan tested

### Business Team

- [ ] Go-ahead approval received
- [ ] Rollout timeline confirmed
- [ ] Communication plan ready
- [ ] Success metrics defined

---

## Success Criteria

**Feature is considered successfully deployed when:**

1. ✅ All database tables migrated without errors
2. ✅ All API endpoints responding with correct data
3. ✅ Frontend components rendering correctly
4. ✅ Employees see deadline timer on dashboard
5. ✅ Supervisors can view team submission status
6. ✅ Admins can generate reports and trends
7. ✅ Late submissions tracked in AuditLog
8. ✅ No critical errors in production logs
9. ✅ System response times < 500ms
10. ✅ Positive feedback from user testing

**Expected Outcome:**

- 85%+ on-time submission rate (within 1 week)
- 0 critical production issues
- Positive user feedback on deadline enforcement

---

## Contact & Escalation

### For Issues During Deployment

1. **API Issues:** Contact Backend Team Lead
2. **Frontend Issues:** Contact Frontend Team Lead
3. **Database Issues:** Contact DBA
4. **Critical Issues:** Contact DevOps (rollback decision)

### Post-Deployment Support

- **Week 1:** Daily standup with full team
- **Week 2-4:** Twice weekly check-ins
- **Month 2+:** Weekly status reports

---

**Deployment Ready: YES ✅**

**Last Updated:** February 9, 2026  
**Approved By:** [Release Manager Name]  
**Deployment Date:** [To be scheduled]
