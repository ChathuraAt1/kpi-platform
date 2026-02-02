# KPI Platform Feature Checklist

Use this checklist to mark progress for major features and deliverables. Update items as work progresses.

## Core Backend

- [x] Spec document: Draft and finalize project specification ([docs/kpi-platform-spec.md](docs/kpi-platform-spec.md))
- [x] ER diagram: Mermaid ER in the spec
- [x] Migrations: tasks, task_logs, todos, kpi_categories, monthly_evaluations, api_keys, comments, attachments, audit_logs
- [x] Models & factories: Eloquent models and factories for domain entities
- [x] Controllers & routes: API controllers and `routes/api.php` registrations
- [x] Validation requests & policies: FormRequest classes and policies registered in `AuthServiceProvider`
- [ ] API contract: Define endpoints, request/response schemas, and permissions

## LLM & AI

- [x] LLM job & adapters: queued classification job, rule-based classifier, LLM client
- [x] OpenAI provider & failover: provider adapter, per-key usage tracking, failover logic
- [ ] Key health-check & circuit breaker: scheduled health-check, cooldown and auto-reenable
- [ ] Monthly aggregation & evaluations: aggregation job, LLM summarization, manager review workflow

## Frontend & UX

- [ ] Frontend: Task grid, daily submission UI, dashboards, manager review interface
- [ ] Admin UI for API keys: add/rotate keys, view usage, set provider priority

## QA, Monitoring & Deployment

- [ ] Tests & CI: unit and integration tests, CI configuration
- [ ] Monitoring & DLQ: job monitoring, dead-letter queue handling, usage/billing alerts
- [ ] Deployment & infra: provisioning scripts, Redis, DB, and deployment guide

## Documentation

- [ ] Documentation & README: setup, run, and contribution guidelines; link to spec and checklist

---

How to use:

- Check boxes as items are completed.
- Keep this file updated and reference it in PR descriptions.
