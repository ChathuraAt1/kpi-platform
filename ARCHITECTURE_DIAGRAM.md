# Supervisor Approval System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SupervisorTeamLogs.jsx Component                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  State Management:                                           │  │
│  │  • subordinates: User[]                                      │  │
│  │  • searchTerm: string                                        │  │
│  │  • allLogs: TaskLog[]                                        │  │
│  │  • supervisorScores: {logId: score}                         │  │
│  │  • expandedLog: logId | null                                │  │
│  │  • filters: {status, date_from, date_to, employee_id}      │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↕                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  UI Layers:                                                   │  │
│  │                                                              │  │
│  │  1. Header Section (Title, Description)                     │  │
│  │  2. Search & Filter Panel (Input, Dropdowns)               │  │
│  │  3. Task Log Cards List (Expandable)                       │  │
│  │     • Summary View (Default)                               │  │
│  │     • Expanded View (On Click)                             │  │
│  │  4. AI Assessment Display                                  │  │
│  │  5. Supervisor Score Input                                 │  │
│  │  6. Final Score Display                                    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↕                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Axios HTTP Client (with auth interceptor)                   │  │
│  │                                                              │  │
│  │  GET /api/task-logs (fetch logs)                           │  │
│  │  POST /api/task-logs/{id}/supervisor-score (save score)    │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↕ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Laravel 12)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  routes/api.php                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  Route::middleware('auth:sanctum')->group(function() {      │  │
│  │    GET    /task-logs                      → index()         │  │
│  │    POST   /task-logs/{id}/supervisor-score → save_score()   │  │
│  │  });                                                        │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓                                        │
│  TaskLogController.php                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  public function index(Request $request)                    │  │
│  │  ├─ Validate query params (filters)                        │  │
│  │  ├─ Query TaskLog with filters                             │  │
│  │  ├─ Load relationships (user, kpiCategory)                 │  │
│  │  └─ Return response with metadata                          │  │
│  │                                                              │  │
│  │  public function saveSupervisorScore($id, Request $r)       │  │
│  │  ├─ Validate supervisor_score (0-100)                      │  │
│  │  ├─ Find TaskLog by id                                     │  │
│  │  ├─ Update metadata['supervisor_score']                    │  │
│  │  ├─ Save to database                                       │  │
│  │  └─ Return updated log                                     │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓                                        │
│  TaskLog Model                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │  class TaskLog extends Model {                              │  │
│  │    protected $casts = [                                     │  │
│  │      'metadata' => 'array'  ← JSON storage                 │  │
│  │    ];                                                       │  │
│  │                                                              │  │
│  │    public function user() { ... }      ← Relations         │  │
│  │    public function task() { ... }                          │  │
│  │    public function kpiCategory() { ... }                   │  │
│  │  }                                                          │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                            ↓                                        │
│  Middleware: auth:sanctum (Verify token)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL/PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  task_logs table                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                                                            │   │
│  │ id            (INT, PRIMARY KEY)                           │   │
│  │ user_id       (INT, FOREIGN KEY → users)                 │   │
│  │ task_id       (INT, NULLABLE, FOREIGN KEY → tasks)       │   │
│  │ date          (DATE)                                       │   │
│  │ duration_hours (DECIMAL)                                   │   │
│  │ description   (TEXT)                                       │   │
│  │ priority      (ENUM: low, medium, high)                  │   │
│  │ kpi_category_id (INT, NULLABLE, FK → kpi_categories)     │   │
│  │ status        (ENUM: submitted, pending, approved, etc)   │   │
│  │                                                            │   │
│  │ metadata      (JSON) ◄─── KEY FIELD                      │   │
│  │ {                                                         │   │
│  │   "completion_percent": 95,                              │   │
│  │   "ai_score": 82.50,         ◄─── AI Assessment         │   │
│  │   "ai_feedback": "...",                                  │   │
│  │   "supervisor_score": 85.0,  ◄─── Supervisor Score      │   │
│  │   "type": "task",                                        │   │
│  │   "assigned_by": "Self"                                  │   │
│  │ }                                                         │   │
│  │                                                            │   │
│  │ created_at    (TIMESTAMP)                                │   │
│  │ updated_at    (TIMESTAMP)                                │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  users table                 kpi_categories table                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐    │
│  │ id, name, email      │    │ id, name, description        │    │
│  └──────────────────────┘    └──────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Load Task Logs

```
User opens page
    ↓
Component mounts
    ↓
Fetch subordinates: GET /api/users?team_view=1
    ↓ (response in subordinates state)
Fetch task logs: GET /api/task-logs?submitted=true
    ↓ (response in allLogs state)
Parse supervisor_scores from metadata
    ↓ (store in supervisorScores state)
Filter & display list
    ↓
Ready for interaction
```

### Search & Filter Flow

```
User types in search box / changes filter
    ↓
Update state (searchTerm, filters)
    ↓
Client-side filtering (allLogs.filter(...))
    ↓
Update displayed filteredLogs
    ↓
UI re-renders (React virtual DOM)
    ↓
Results shown instantly (no API call)
```

### Expand Task Log

```
User clicks card
    ↓
Update expandedLog state to log.id
    ↓
Conditional rendering shows expanded view
    ↓
Display full details, AI assessment, score input
    ↓
All data already loaded (no new API call)
```

### Save Supervisor Score

```
User enters score 0-100
    ↓
Update local supervisorScores[logId] state
    ↓
User clicks "Save Score"
    ↓
Update savingScore state → "Saving..." button
    ↓
POST /api/task-logs/{id}/supervisor-score
    {supervisor_score: 85.0}
    ↓
Backend validates input
    ↓
Backend updates metadata['supervisor_score']
    ↓
Backend saves to DB
    ↓
Backend returns updated log
    ↓
Frontend receives response
    ↓
Update local supervisorScores state
    ↓
Recalculate final score = (AI + Supervisor) / 2
    ↓
Update savingScore state → null (button normal)
    ↓
Display success & updated scores
```

---

## Component Hierarchy

```
App
└── Router
    └── ProtectedRoute
        └── Layout
            └── Sidebar (links)
            └── MainContent
                └── SupervisorTeamLogs
                    ├── Header
                    ├── SearchFilterPanel
                    │   ├── SearchInput
                    │   ├── EmployeeSelector
                    │   ├── DateRangePicker
                    │   └── StatusFilter
                    └── TaskLogsList
                        └── TaskLogCard (repeating)
                            ├── SummaryView (collapsed)
                            │   ├── EmployeeInfo
                            │   ├── TaskTitle
                            │   ├── TimeMetrics
                            │   ├── AIScore
                            │   └── FinalScore
                            └── ExpandedView (on click)
                                ├── TaskDetailsPanel
                                ├── MetricsPanel
                                ├── AIAssessmentSection
                                └── SupervisorScoreSection
```

---

## Authentication Flow

```
User logs in at /login
    ↓
POST /sanctum/csrf-cookie (get CSRF token)
    ↓
POST /login (email, password)
    ↓ (returns {access_token: "...", ...})
Store token in localStorage
    ↓
Axios sets Authorization header for all requests:
    Authorization: Bearer {token}
    ↓
All API requests include token
    ↓
Backend middleware verifies token (auth:sanctum)
    ↓
Request allowed
```

---

## Error Handling Flow

```
User action triggers API call
    ↓
Try-catch wrapper around axios
    ↓
    ├─ Success (200-299)
    │   └─ Process response data
    │
    ├─ Validation Error (400, 422)
    │   └─ Display validation errors
    │
    ├─ Auth Error (401, 403)
    │   └─ Redirect to login / show permission error
    │
    ├─ Not Found (404)
    │   └─ Show "resource not found" message
    │
    └─ Server Error (500+)
        └─ Show generic error, suggest reload
```

---

## State Management Pattern

```
Component Props
    ↓
Component State (useState hooks)
    ↓
Event Handler (onClick, onChange)
    ↓
State Updater (setXxx)
    ↓
Effect Hook (useEffect) watches state
    ↓
API Call if needed
    ↓
Response updates state
    ↓
Component re-renders
```

---

## Performance Optimization Strategy

```
Initial Load
├─ Fetch users (small data)
├─ Fetch task logs (potentially large)
└─ Store in state

Client-Side Operations
├─ Search: O(n) filter
├─ Filter: O(n) filter
└─ Display: React virtual DOM diffing

API Calls
├─ Load: 1 call (all logs at once)
├─ Search: 0 calls (client-side)
└─ Save Score: 1 call per score (async)

Result
├─ Minimal API traffic
├─ Instant search/filter
├─ Non-blocking score saves
└─ Responsive UI
```

---

## Caching Strategy

```
Current:
├─ No caching (data fresh on each load)
└─ Supervisor scores loaded from metadata

Future Options:
├─ Cache task logs for 1 minute
├─ Cache invalidation on score save
├─ Use localStorage for quick reload
└─ Implement Redis on backend
```

---

## Scaling Considerations

```
Current Design:
├─ Single page fetch (all logs)
├─ Client-side filtering
└─ Suitable for teams < 1000 employees

For Larger Scale:
├─ Implement pagination (50 items/page)
├─ Add server-side filtering (reduce data)
├─ Implement lazy loading (load on scroll)
├─ Cache frequently accessed data
└─ Consider search index (Elasticsearch)
```

---

## Security Architecture

```
Authentication
├─ Sanctum bearer tokens
├─ CSRF protection
└─ Session-based auth

Authorization
├─ User can only see their team's logs
├─ Only supervisors can score
└─ Role-based middleware

Data Protection
├─ All data encrypted in transit (HTTPS)
├─ Metadata JSON stored securely
├─ Audit trail (who scored what)
└─ Database backups
```

---

## Deployment Architecture

```
Development (Local)
├─ npm run dev (frontend)
├─ php artisan serve (backend)
└─ SQLite database

Production (Server)
├─ Build: npm run build
├─ Backend: php artisan (queue workers)
├─ Nginx/Apache server
├─ MySQL database
├─ Redis caching
└─ SSL/HTTPS
```

---

**Last Updated:** December 2024
**Version:** 1.0
**Architecture Status:** ✅ Ready
