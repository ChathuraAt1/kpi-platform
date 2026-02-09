# Supervisor Approval API Contract

## Endpoints

### 1. Fetch Task Logs (with filters)

**Endpoint:** `GET /api/task-logs`

**Query Parameters:**

```
submitted=true          (boolean, required) - Show only submitted task logs
employee_id=X          (integer, optional) - Filter by employee ID
status=X               (string, optional) - Filter by status
date_from=YYYY-MM-DD   (date, optional) - Filter from date
date_to=YYYY-MM-DD     (date, optional) - Filter to date
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "user": {
        "id": 5,
        "name": "John Smith",
        "email": "john@example.com"
      },
      "task_id": 42,
      "task": {
        "id": 42,
        "title": "API Integration",
        "priority": "high"
      },
      "date": "2024-12-15",
      "duration_hours": 4.5,
      "description": "Completed API integration for new dashboard",
      "priority": "high",
      "kpi_category_id": 3,
      "kpi_category": {
        "id": 3,
        "name": "Technology & Infrastructure"
      },
      "metadata": {
        "completion_percent": 95,
        "ai_score": 82.50,
        "ai_feedback": "Strong task execution with good time management...",
        "supervisor_score": 85.0,
        "type": "task"
      },
      "status": "submitted",
      "created_at": "2024-12-15T09:30:00Z",
      "updated_at": "2024-12-15T14:22:00Z"
    },
    {...},
    {...}
  ]
}
```

**Error (400/401/403):**

```json
{
    "message": "Unauthorized",
    "status": 401
}
```

---

### 2. Save Supervisor Score

**Endpoint:** `POST /api/task-logs/{id}/supervisor-score`

**Parameters:**

```
{id} - Task Log ID (integer, in URL path)
```

**Request Body:**

```json
{
    "supervisor_score": 85.5
}
```

**Validation:**

- `supervisor_score`: required, numeric, min:0, max:100

**Response (200 OK):**

```json
{
  "message": "Supervisor score saved successfully",
  "log": {
    "id": 1,
    "user_id": 5,
    "user": {...},
    "task_id": 42,
    "date": "2024-12-15",
    "duration_hours": 4.5,
    "description": "Completed API integration for new dashboard",
    "metadata": {
      "completion_percent": 95,
      "ai_score": 82.50,
      "ai_feedback": "Strong task execution...",
      "supervisor_score": 85.5,        ← Updated
      "type": "task"
    },
    "status": "submitted",
    "created_at": "2024-12-15T09:30:00Z",
    "updated_at": "2024-12-15T15:45:00Z"   ← Updated
  }
}
```

**Error (400 - Validation Failed):**

```json
{
    "message": "The given data was invalid.",
    "errors": {
        "supervisor_score": [
            "The supervisor score must be a number.",
            "The supervisor score must be between 0 and 100."
        ]
    }
}
```

**Error (404 - Not Found):**

```json
{
    "message": "Resource not found"
}
```

**Error (401 - Unauthorized):**

```json
{
    "message": "Unauthenticated."
}
```

---

## Data Model

### TaskLog Model

```php
{
  id: integer,
  user_id: integer (owner of task log),
  task_id: integer (nullable, link to Task),
  date: date,
  duration_hours: decimal,
  description: string,
  priority: enum['low', 'medium', 'high'],
  kpi_category_id: integer (nullable),
  status: enum['submitted', 'pending', 'approved', 'rejected'],
  metadata: json {
    completion_percent: integer (0-100),
    ai_score: decimal (0-100, nullable),
    ai_feedback: string (nullable),
    supervisor_score: decimal (0-100, nullable),
    type: enum['task', 'break', 'shift_end'],
    ...other fields
  },
  approved_by: integer (nullable),
  approved_at: timestamp (nullable),
  created_at: timestamp,
  updated_at: timestamp
}
```

### Metadata Structure

```json
{
    "completion_percent": 95,
    "ai_score": 82.5,
    "ai_feedback": "Good work on completing all deliverables...",
    "supervisor_score": 85.0,
    "type": "task",
    "assigned_by": "Self"
}
```

---

## Frontend Integration

### Fetch All Task Logs

```javascript
// In SupervisorTeamLogs.jsx
const response = await axios.get("/api/task-logs", {
    params: {
        submitted: true,
        employee_id: filters.employee_id || undefined,
        status: filters.status || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
    },
});

const logs = response.data.data || [];
```

### Save Supervisor Score

```javascript
const response = await axios.post(`/api/task-logs/${logId}/supervisor-score`, {
    supervisor_score: parseFloat(score),
});

// Extract updated log from response
const updatedLog = response.data.log;
```

### Calculate Final Score

```javascript
const aiScore = log.metadata?.ai_score;
const supervisorScore = supervisorScores[log.id];

const finalScore =
    supervisorScore !== undefined && aiScore
        ? ((parseFloat(aiScore) + parseFloat(supervisorScore)) / 2).toFixed(2)
        : aiScore || "Pending";
```

---

## Authentication

All endpoints require Sanctum bearer token:

```
Authorization: Bearer {token}
```

Token is obtained via:

1. `GET /sanctum/csrf-cookie` (get CSRF token)
2. `POST /login` (authenticate and receive bearer token)
3. Store token in localStorage as `auth_token`
4. Axios automatically includes in all requests

---

## Rate Limiting (Future)

Suggested rate limits:

- GET /api/task-logs: 100 requests/minute
- POST /api/task-logs/{id}/supervisor-score: 30 requests/minute

---

## Workflow Integration

### Step 1: Page Load

```
GET /api/task-logs?submitted=true
  ↓
Display list of task logs
```

### Step 2: Filter/Search (Client-side)

```
User modifies search/filters
  ↓
Manually trigger new fetch if applicable
  ↓
Update displayed logs
```

### Step 3: Expand Task Log

```
User clicks card
  ↓
Show expanded details (no new API call needed - data already loaded)
```

### Step 4: Add Supervisor Score

```
User enters score 0-100
  ↓
User clicks "Save Score"
  ↓
POST /api/task-logs/{id}/supervisor-score
  ↓
Update local state with new score
  ↓
Recalculate final score
  ↓
Show success feedback
```

---

## Testing Examples

### Test 1: Fetch Task Logs

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8000/api/task-logs?submitted=true&employee_id=5"
```

### Test 2: Save Supervisor Score

```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"supervisor_score": 85.5}' \
  "http://localhost:8000/api/task-logs/1/supervisor-score"
```

### Test 3: Invalid Score

```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"supervisor_score": 150}' \
  "http://localhost:8000/api/task-logs/1/supervisor-score"

# Response: 422 with validation error
```

---

## Response Headers

All responses include:

```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1702700400
```

---

## Error Handling

### Common Errors

**401 Unauthorized**

```json
{
    "message": "Unauthenticated.",
    "status": 401
}
```

Action: User needs to re-login, refresh bearer token

**403 Forbidden**

```json
{
    "message": "Unauthorized - Only supervisors can score task logs",
    "status": 403
}
```

Action: User doesn't have permission, contact admin

**404 Not Found**

```json
{
    "message": "Resource not found",
    "status": 404
}
```

Action: Task log doesn't exist or was deleted

**422 Unprocessable Entity**

```json
{
    "message": "The given data was invalid.",
    "errors": {
        "supervisor_score": ["The supervisor score must be between 0 and 100."]
    },
    "status": 422
}
```

Action: Fix validation errors in request

**500 Server Error**

```json
{
    "message": "Internal server error",
    "status": 500
}
```

Action: Check server logs, contact admin

---

## Caching Strategy

Currently: No caching implemented
Future recommendations:

- Cache task logs list for 1 minute
- Invalidate cache on score save
- Use ETag headers for 304 Not Modified responses
- Consider Redis caching for large datasets

---

## Monitoring & Analytics

Track:

- Time to fetch task logs (should be < 500ms)
- Time to save score (should be < 200ms)
- Error rate on supervisor score endpoint
- Average supervisor score vs AI score correlation
- Number of supervisor scores per batch
