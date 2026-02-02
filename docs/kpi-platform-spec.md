# KPI Task-Log & Evaluation Platform — Full Specification

Version: 0.1
Date: 2026-02-02
Author: Project Spec (generated)

## 1. Overview

This document is the full technical specification for a KPI task-log and evaluation platform intended to replace twice-daily emailed Excel task logs. The system supports: excel-like task logging, todo management, LLM-assisted categorization, role-based dashboards, monthly KPI evaluations (fusion of rule-based, LLM, and human scores), and an API-key repository with provider failover.

Scope (MVP): daily task submissions, todo management, per-submission LLM categorization, manager approval workflow, monthly evaluation draft generation, admin API-key management, RBAC.

## 2. Goals & Non-goals

- Goals:
    - Replace emailed Excel logs with structured submissions.
    - Provide easy, excel-like UI for batch entry.
    - Provide configurable work hours and breaks per user/role.
    - Use LLMs to categorize tasks into KPI categories.
    - Provide monthly KPI evaluations that combine rule-based scoring, LLM scoring, and manager/HR input.
    - Maintain a secure repo of API keys and perform provider failover.

- Non-goals (MVP):
    - Machine learning training pipelines (beyond storing labeled overrides)
    - Full HR payroll integration (out of scope)

## 3. Tech Stack (recommended)

- Backend: PHP 8.2+, Laravel 12
- Auth: Laravel Sanctum (SPA) + spatie/laravel-permission
- DB: MySQL / PostgreSQL (Redis for queues & caching)
- Frontend: React 19 + Vite, Tailwind CSS
- Queues: Redis + Laravel Queues (Horizon optional)
- Storage: S3-compatible for attachments
- LLM Providers: OpenAI, Anthropic, Cohere, custom HF endpoints
- Observability: Sentry, Prometheus/Grafana (infra)

## 4. High-level architecture

Mermaid sequence (simplified):

```mermaid
flowchart LR
  User[Employee UI]
  Frontend[React SPA]
  API[Laravel API]
  DB[(DB)]
  Queue[Redis Queue]
  Worker[LLM Worker]
  LLM[LLM Providers]
  AdminUI[Admin UI]

  User --> Frontend --> API
  API --> DB
  API --> Queue
  Queue --> Worker --> LLM
  AdminUI --> API
  API --> DB
```

## 5. ER Diagram

```mermaid
erDiagram
    USERS ||--o{ TASKS : owns
    USERS ||--o{ TASK_LOGS : submits
    USERS ||--o{ TODOS : owns
    TASKS ||--o{ TASK_LOGS : has
    TASKS }|--|{ KPI_CATEGORIES : categorized_by
    TASK_LOGS }|--|{ KPI_CATEGORIES : categorized_by
    USERS ||--o{ MONTHLY_EVALUATIONS : evaluated
    API_KEYS ||--o{ LLM_REQUESTS : used_by
    TASK_LOGS ||--o{ COMMENTS : has
    TASKS ||--o{ ATTACHMENTS : has
    TASK_LOGS ||--o{ ATTACHMENTS : has
    AUDIT_LOGS ||--o{ USERS : about

    USERS {
      bigint id PK
      string name
      string email
      string password
      json settings
      timestamps
    }
    TASKS {
      bigint id PK
      bigint owner_id FK
      bigint assignee_id FK
      bigint parent_id FK
      string title
      text description
      decimal planned_hours
      enum status
      date due_date
      json metadata
      timestamps
    }
    TASK_LOGS {
      bigint id PK
      bigint task_id FK
      bigint user_id FK
      date date
      decimal duration_hours
      text description
      bigint kpi_category_id FK
      json llm_suggestion
      enum status
      bigint approved_by FK
      datetime approved_at
      json metadata
      timestamps
    }
    TODOS {
      bigint id PK
      bigint user_id FK
      string title
      text notes
      date due_date
      enum priority
      bool completed
      timestamps
    }
    KPI_CATEGORIES {
      bigint id PK
      string name
      text description
      decimal weight
      json metadata
      timestamps
    }
    MONTHLY_EVALUATIONS {
      bigint id PK
      bigint user_id FK
      smallint year
      tinyint month
      decimal score
      json breakdown
      string generated_by
      enum status
      bigint approved_by FK
      timestamps
    }
    API_KEYS {
      bigint id PK
      bigint user_id FK
      string provider
      string name
      text encrypted_key
      integer priority
      integer daily_quota
      integer daily_usage
      enum status
      datetime last_checked_at
      timestamps
    }
    COMMENTS {
      bigint id PK
      string commentable_type
      bigint commentable_id
      bigint user_id FK
      text text
      timestamps
    }
    ATTACHMENTS {
      bigint id PK
      string attachable_type
      bigint attachable_id
      bigint user_id FK
      string path
      string filename
      string mime
      integer size
      timestamps
    }
    AUDIT_LOGS {
      bigint id PK
      bigint user_id FK
      string action
      text old_values
      text new_values
      string ip_address
      datetime created_at
    }
```

## 6. Database Schema (table-by-table)

- `users` — standard Laravel users with `settings` JSON (shift start/end, breaks override)
- `roles` / `permissions` — use `spatie/laravel-permission`
- `tasks` — planned work items; supports parent/child, assignee, planned hours, kpi_category link
- `task_logs` — daily submissions (one or more rows per day). Key: `user_id`, `date`, `duration_hours`, `description`, `kpi_category_id`, `llm_suggestion` (json), `status` (pending/approved/rejected)
- `todos` — per-user todo items (for planning)
- `kpi_categories` — category definitions, weights, description
- `monthly_evaluations` — stored evaluation result per user/month with `breakdown` JSON
- `api_keys` — encrypted provider keys with status, priority, daily_quota, daily_usage
- `comments`, `attachments`, `audit_logs`

Indexes: common indexes on `user_id`, `date`, `status`, `kpi_category_id` and FKs.

## 7. API Contract (Representative endpoints)

Auth notes: Use Laravel Sanctum for SPA sessions or token-based. All `/api` endpoints are JSON. Use standard HTTP status codes.

1. Register

- POST /api/register
- Auth: public
- Body:

```json
{ "name": "string", "email": "string", "password": "string" }
```

- Response 201:

```json
{ "user": { "id": 1, "name": "...", "email": "..." }, "token": "..." }
```

2. Login

- POST /api/login
- Auth: public
- Body:

```json
{ "email": "string", "password": "string" }
```

- Response 200:

```json
{ "user": {"id":1,...}, "token":"..." }
```

3. Get current user

- GET /api/user
- Auth: Bearer or Sanctum cookie
- Response 200: user plus `roles` and `settings`

4. Tasks - List

- GET /api/tasks?assigned=true&status=open&from=2026-01-01&to=2026-01-31
- Auth: authenticated
- Perms: users see their tasks; managers see team
- Response 200: paginated tasks

5. Tasks - Create

- POST /api/tasks
- Auth: authenticated
- Body:

```json
{
    "title": "string",
    "description": "string",
    "assignee_id": 123,
    "kpi_category_id": 3,
    "planned_hours": 1.5
}
```

- Response 201: created task object

6. Task Logs - Batch Submit (core)

- POST /api/task-logs
- Auth: authenticated
- Purpose: submit multiple rows at once (morning plan or end-of-day actuals)
- Body:

```json
{
    "date": "2026-02-02",
    "rows": [
        {
            "task_id": 1,
            "duration_hours": 2.5,
            "start_time": "08:30",
            "end_time": "10:50",
            "description": "Worked on X",
            "priority": "high",
            "kpi_category_id": null
        }
    ],
    "shift_override": {
        "start": "08:30",
        "end": "17:30",
        "breaks": [{ "from": "10:30", "to": "10:50" }]
    }
}
```

- Response 202: accepted; returns ids and LLM-suggestion placeholders
- Behavior: API enqueues LLM classification job per-row or batched per-user/day.

7. Task Log - Approve

- POST /api/task-logs/{id}/approve
- Auth: manager
- Body: { "comment": "Looks good" }
- Response: 200 with updated status

8. Todos endpoints: /api/todos (CRUD) — standard

9. KPI endpoints

- GET /api/kpis — list categories and weights
- GET /api/users/{id}/kpis?year=2026&month=1 — returns monthly evaluations

10. Evaluations - Generate (admin/system)

- POST /api/evaluations/generate
- Auth: system/admin
- Body: { "year":2026, "month":1 }
- Response: 202 accepted with evaluation job id
- Behavior: enqueues aggregation job which runs rule-based scoring, calls LLM for summary/scoring, stores draft in `monthly_evaluations`.

11. API Keys - Admin

- GET /api/api-keys
- POST /api/api-keys
    - Body:
    ```json
    {
        "provider": "openai",
        "name": "key-prod-1",
        "key": "sk-...",
        "priority": 10,
        "daily_quota": 100000
    }
    ```
- DELETE /api/api-keys/{id}

12. Admin overview

- GET /api/admin/overview — metrics: missing submissions, late rates, LLM usage, keys health

Error format:

```json
{ "message": "Validation error", "errors": { "field": ["msg"] } }
```

## 8. Request/Response JSON Schemas (examples)

Task Log Row (input):

```json
{
    "task_id": 42,
    "duration_hours": 1.5,
    "start_time": "08:30",
    "end_time": "10:00",
    "description": "Fixed issue #123",
    "priority": "high",
    "kpi_category_id": null
}
```

Task Log Row (stored/returned):

```json
{
    "id": 987,
    "task_id": 42,
    "user_id": 11,
    "date": "2026-02-02",
    "duration_hours": 1.5,
    "description": "Fixed issue #123",
    "kpi_category_id": 3,
    "llm_suggestion": { "category": "Operational Support", "confidence": 0.93 },
    "status": "pending",
    "created_at": "..."
}
```

Evaluation object:

```json
{
    "id": 123,
    "user_id": 11,
    "year": 2026,
    "month": 1,
    "score": 8.4,
    "breakdown": { "Delivery": 8.0, "Support": 9.2 },
    "sources": { "rule_based": 7.9, "llm": 8.5, "manager": 8.8 },
    "status": "draft",
    "created_at": "..."
}
```

## 9. Auth & Roles

- Use Laravel Sanctum for SPA session tokens.
- Install `spatie/laravel-permission`.

Roles and baseline permissions:

- `employee` (submit logs, create todos, view own KPIs)
- `supervisor` (view team, approve/reject logs, write remarks)
- `hr` (view/publish evaluations, export)
- `management` (view org KPIs)
- `admin` (manage users, keys, settings)

Middleware: `role:supervisor` and `permission:approve_log` style gates.

## 10. LLM Integration Design

Objectives:

- Map free-text task descriptions to KPI categories per-row.
- Summarize monthly data into human-readable narratives.
- Provide confidence and top-N suggestions.

Design:

1. Light-weight rule-based classifier (regex/keyword + category lookup) runs first for cheap, deterministic mapping.
2. LLM worker runs asynchronously (Redis queue) on accepted submission batches. Worker groups rows per-user-per-day into batches to reduce tokens.
3. Prompting: fixed system prompt enumerating category names, definitions, and 6-10 examples; strict JSON output schema required.
4. Token optimization: compress examples, remove long descriptions, use succinct schema, send only minimal context.
5. Provider adapters: implement interface `LLMProvider::class` with methods `classify(rows):Suggestion[]` and `summarize(rows):Summary`.
6. Failover: API key manager selects healthy key; on 429/5xx, worker retries with exponential backoff and switches keys/providers per strategy.
7. Persistence: store raw LLM response, parsed suggestion (category, confidence), provider metadata, and request token usage for billing.

Prompt example (system + few-shot):

```
System: You map the following user task descriptions into one of these KPI categories: [Delivery, Support, Administration, Research]. Return JSON: {"category":"<one>","confidence":0.00,"reasons":"..."}

Example: "Fixed production API bug" -> {"category":"Support","confidence":0.98}

### Other provider options & integration alternatives

- OpenAI / Azure OpenAI: high-quality chat models; Azure requires `endpoint` + `api_key` and may return different headers for usage. Good for classification and summarization.
- Anthropic (Claude): chat-style interface with deterministic controls; requires different prompt styles and handles JSON outputs well.
- Cohere: strong for classification and embeddings; cheaper options for high-throughput inference.
- Google Gemini / Vertex AI (AI Studio): enterprise-grade models via Google Cloud; supports long-context models and model selection by endpoint.
- Hugging Face Inference API / Self-hosted HF models: supports custom models (Llama, Falcon). Useful for privacy / on-prem deployments.
- Self-hosted LLMs (Llama 2, Mistral, private HF): run inference on local GPUs or managed inference clusters for sensitive data; requires extra infra (GPU, autoscaling).
- Custom HTTP endpoints: allow teams to plug any model that accepts simple request/response JSON (useful for internal model servers).

Integration alternatives:
- Synchronous calls for small batches with immediate UX feedback (but risk higher latency and retries).
- Asynchronous queued inference (recommended for batch classification and summarization) with retries, DLQ, and backoff.
- Webhook/callback support for providers that offer async callbacks; useful to reduce worker time.
- Use embeddings + vector search (via OpenAI/HF/Cohere) to classify by similarity to labeled examples when categories are fuzzy.

Provider selection guidelines:
- Prefer deterministic models (low temperature) for classification.
- Use smaller cheaper models for routine classification and reserve larger models for summarization or complex reasoning.
- Store provider metadata in `api_keys.meta` (model, endpoint, region, rate-limit headers mapping).

Cost & monitoring recommendations:
- Track per-key token/usage in `api_keys.daily_usage` and expose dashboards for spend by provider.
- Implement token-budget guards (do not call provider when projected monthly spend exceeds threshold) and fallbacks to cheaper providers.
- Emit metrics for latency, error rates, and 429 counts; alert on abnormal cost spikes.

Privacy and compliance notes:
- Redact or pseudonymize PII before sending prompts when possible.
- For regulated environments, prefer on-prem or private-cloud hosted models and restrict outbound traffic.

```

## 11. API Key Management Design

Schema: `api_keys` table (see ER diagram). Keys encrypted at rest (Laravel encryption or KMS). Store provider metadata (rate-limit headers mapping) in `meta` JSON.

Selection algorithm:

- Filter active keys for requested provider.
- Exclude keys exceeding daily_quota or marked degraded.
- Sort by priority ascending (lower = preferred) and last_checked_at success.
- Use round-robin within same priority if multiple keys.

Health & rate-limit detection:

- On each provider call, parse response headers: `X-RateLimit-Remaining`, `Retry-After`, etc.
- If 429 or repeated 5xx errors, increment error counter and mark key as `degraded` for a cooldown window (circuit-breaker).

Admin UI features:

- Add / rotate / disable key
- Test key (test request to provider)
- Show daily_usage, health graph, last_error

## 12. Scheduling and Workflows

- Reminders: daily reminders to users with missing submissions at 20:00 and 22:30 local time.
- Finalize day: nightly job at 23:59 to aggregate submissions and compute per-day metrics.
- Monthly evaluation: run at 00:05 on 1st of month to draft previous month evaluations, enqueue LLM summarization tasks and store drafts.
- Approval workflow: managers receive notifications on new pending logs; expected SLA: 48 hours to review.

## 13. Security & Privacy

- Encrypt API keys at rest (KMS recommended). Use HTTPS everywhere.
- RBAC via `spatie/laravel-permission` and middleware.
- Audit logs for all sensitive actions (submit/approve/key changes/export).
- File uploads: virus scan (optional), size limits, content-type checks.
- Data retention: configurable retention policies for raw LLM outputs; PII minimization for prompts (redact personal data before sending to external LLMs).
- Admin 2FA encouraged for critical roles.

## 14. Observability & Testing

- Log LLM calls (request/response, cost metrics), errors, and key health.
- Add unit tests for scoring rules, API endpoints, and E2E tests for core flows.
- CI pipeline to run PHPStan, Pest/PHPUnit, and basic frontend tests.

## 15. Milestones & Estimates (developer-days)

1. Scaffold & Auth (3d): Sanctum, users, spatie permissions
2. Data Model & APIs (7d): migrations, models, controllers, validation, tests
3. Frontend MVP (8d): TaskGrid, SubmissionForm, Dashboard (React)
4. LLM & Key Manager (5d): provider adapters, queue worker, admin UI
5. Approvals & Scheduling (5d): manager flows, scheduler, notifications
6. QA & Deployment (3d): tests, security hardening, docs

Total MVP: ~31 dev-days

## 16. Acceptance Criteria (MVP)

- Employee can submit daily task logs via an excel-like UI (single or batched rows) and set shift/break overrides.
- Submitted rows are persisted and show LLM suggestions for categories.
- Manager can view, approve, reject logs and add remarks.
- System generates monthly evaluation drafts combining rule-based and LLM inputs; manager/HR can publish final scores.
- Admin can add/rotate API keys and view key health; system uses failover on rate limits.
- RBAC enforced; audit logs recorded for critical actions.

## 17. Next Steps (implementation options)

- I can scaffold the DB migrations and models next (recommended), or produce the full API controller skeletons and route definitions.
- Choose next: `migrate+models` or `api-skeleton` or `frontend-skeleton`.

## 18. Detailed Functional Requirements (from stakeholder brief)

This section expands the spec with exact product requirements described by the stakeholder: twice-daily plan/actuals workflow, task-based to-do driven data model, precise submission rules, per-role KPI configuration, and API-key repository behavior.

18.1 Submission workflow (morning plan / evening actuals)

- Two submissions per workday:
    - Morning (Plan): employee submits planned to-dos for the day (may include unfinished carry-over tasks).
    - Evening (Actual): employee submits actual task logs with worked durations and completion percentage.
- Required fields per log row: `task_id` (optional), `title` (if new task), `start_time`, `end_time`, `duration_hours`, `description`, `priority` (low|medium|high|urgent), `assigned_by` (user id), `completion_percentage` (0-100), `attachments` (optional).
- Validation rules:
    - `start_time` < `end_time` and `duration_hours` equals difference (allow minor rounding tolerance).
    - Sum of `duration_hours` per day must not exceed configured shift working minutes (default workday length minus breaks).
    - `completion_percentage` only required for tasks that are marked complete or when partial completion is reported.
- Deadlines & reminders:
    - Daily submission deadline: 23:00 local time; system should reject late submissions unless manager override.
    - Reminder cadence: 20:00 and 22:30 local time; configurable per-team.
    - Escalation: if no submission by 23:30, notify supervisor and HR per team policy.
- Carry-over logic:
    - Any task with `completion_percentage` < 100 at day's end is automatically copied into the next morning's plan (status: unfinished).
    - New tasks created after the morning plan are accepted during evening submission and added to the task registry.

    18.2 Shift & Breaks configuration

- Default company shift: weekdays 08:30–17:30 with breaks at 10:30–10:50, 13:00–14:00, 16:00–16:20.
- Per-user overrides: each user has `settings.shift` JSON with `start`, `end`, and `breaks` array. Overrides validated against company policy.
- UI presets: allow users to save common shift profiles and apply them to a day's submission.

    18.3 To-Do / Task management

- Task model supports `assigned_by`, `assignee_id`, `planned_hours`, `priority`, `kpi_category_id`, `recurrence_rule`, and `metadata`.
- Management features:
    - Create/edit/delete tasks, set recurring tasks, bulk import from CSV/Excel.
    - View per-employee to-do progress in a dashboard (planned vs actual hours, completion %).

    18.4 KPI categories and role-based configuration

- KPI categories are created and managed by management/HR. Each category has `name`, `description`, and default `weight`.
- Role-specific configuration:
    - For each job role, managers set a per-category weight map. Weights are normalized during calculations.
    - A default role profile is available and can be cloned/modified.

    18.5 KPI calculation algorithm (detailed)
    The system computes per-category and overall KPI scores monthly. The default formulas below are configurable by management.

- Per-task score:
    - Let p = `completion_percentage` (0..100), w_task = `priority_weight` (map: low=1, medium=2, high=3, urgent=4 by default), then task_score_raw = p/100 \* w_task.

- Per-category rule-based score (monthly):
    - For category C, sum_task_scores_C = sum(task_score_raw for all tasks assigned to user in month and categorized as C)
    - sum_max_possible_C = sum(1.0 \* w_task for all tasks assigned in month for C) // assumes max completion 100%
    - rule_score_C_10 = (sum_task_scores_C / sum_max_possible_C) \* 10 (range 0..10)
    - If sum_max_possible_C == 0 then rule_score_C_10 = null (no data)

- LLM-based category score (monthly):
    - Submit summarized activity per-category to LLM with token-optimized batch; LLM returns score between 0..10 and a confidence value.

- Manager/HR score: manual 0..10 entry per-category with optional remark.

- Final category score:
    - Let sources = rule_score (R), llm_score (L), manager_score (M). Default weights: wR=1, wL=1, wM=1 (configurable).
    - final_category_score = weighted_average(non-null sources) on 0..10 scale.

- Overall KPI (monthly):
    - Let final_category_score_C be computed above and weight_C be the category weight for user's role.
    - overall_kpi_10 = sum_C(final_category_score_C \* weight_C) / sum_C(weight_C)
    - overall_kpi_percent = overall_kpi_10 \* 10 (i.e., convert to percent out of 100)

Example (numeric):

- Two categories: Delivery (weight 0.6), Support (weight 0.4).
- Delivery: R=8.0, L=7.5, M=8.5 => final = (8.0+7.5+8.5)/3 = 8.0
- Support: R=9.0, L=8.0, M=8.0 => final = 8.333
- overall_kpi_10 = 8.0*0.6 + 8.333*0.4 = 8.1332 -> overall_percent = 81.33%

    18.6 LLM classification & monthly scoring workflow

- Per-submission:
    - On create, a background job runs classification (RuleBasedClassifier -> LLMClient) and stores `llm_suggestion` with `category`, `confidence`, `raw`.
    - UI shows LLM suggestion and confidence; allows user (or later manager) to override category.
- Monthly batch:
    - On 1st of month (configurable), system aggregates monthly rows and enqueues summarization and scoring jobs.
    - Batch jobs should group entries per-user and trim descriptions to reduce tokens; include examples for categories in prompts.
    - Store raw LLM response and parsed scores for audit and retraining.

    18.7 API-Key repository & provider failover

- Each `api_keys` entry: `provider`, `name`, `encrypted_key`, `meta` (model, endpoint, region), `priority`, `daily_quota`, `daily_usage`, `status` (active,degraded,revoked).
- Selection rules:
    - Filter by provider & active status, exclude keys over quota or degraded.
    - Sort by `priority` asc; use round-robin within same priority.
    - On 429/5xx: increment error counter, mark key `degraded` and try next key; record error and notify admin if consecutive failures.
- Admin UI: add/rotate/test keys, view usage and health, force-enable/disable keys, set `meta` (endpoint, available models).

    18.8 Roles, supervisor chains and peer evaluation

- Roles: `employee`, `supervisor`, `hr`, `management`, `admin`. Each role has permissions documented earlier.
- Supervisor chains:
    - Each user can have a `supervisor_id`. Supervisors themselves are users and can be assigned supervisors (hierarchical).
    - Supervisors and HR also get KPIs computed by same process; they appear in manager dashboards for review.

    18.9 Notifications, approvals & SLA

- Notifications: email, in-app, Slack/Teams webhook. Triggers: missing submission reminders, approval requests, evaluation published, API key health alerts.
- Approval SLA: managers should review pending submissions within 48 hours; overdue approval triggers escalation to manager's supervisor and HR.

    18.10 UI/UX requirements

- Excel-like task grid with: column inline edit (start/end times, duration, description, priority, completion %), keyboard navigation, bulk-select and bulk-submit.
- Quick-add row to create new tasks inline; attachment dropzone per-row.
- Visual cues: LLM suggestion badge (category + confidence), approval status chips (pending/approved/rejected), overdue highlights.
- Shift presets and per-day override UI; validation errors shown inline.

    18.11 Audit, export & retention

- Audit logs for create/update/delete of tasks, logs, approvals, API keys, and evaluation publications.
- Export: CSV/Excel per user, per team, per date-range; PDF monthly reports for management.
- Retention: configurable retention policy for raw LLM responses (default 90 days), retention for attachments (default 1 year), GDPR right-to-be-forgotten workflow.

    18.12 Non-functional requirements

- Performance: support concurrent use for N employees (estimate needed) with background workers processing LLM jobs. Use Redis queues and horizontally scalable workers.
- Security: TLS, encrypted keys, RBAC, 2FA for admin roles.
- Observability: logs, metrics, per-key usage dashboards, alerts for cost spikes.

    18.13 Acceptance criteria (extended)

- Morning plan and evening actuals are saved and editable before daily deadline.
- Unfinished tasks automatically carry over to next morning plan.
- LLM suggests categories on submission; suggestion appears in UI with confidence and can be overridden.
- System produces a draft monthly evaluation combining rule-based, LLM, and manager scores; manager can publish final score.
- API-key failover works: when a key returns 429, system uses another key and records the incident.

---

Saved to: docs/kpi-platform-spec.md

Please tell me which implementation step to start next.
