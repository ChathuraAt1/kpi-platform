# Frontend scaffold

This project includes a minimal React + Vite + Tailwind frontend scaffold under `resources/js`.

Pages:

- `/` Employee dashboard — `resources/js/pages/EmployeeDashboard.jsx`
- `/supervisor` Supervisor dashboard — `resources/js/pages/SupervisorDashboard.jsx`
- `/hr` HR dashboard — `resources/js/pages/HRDashboard.jsx`
- `/admin` Admin dashboard — `resources/js/pages/AdminDashboard.jsx`
- `/admin/api-keys` API Keys management — `resources/js/pages/ApiKeysPage.jsx`
- `/admin/users` Users management — `resources/js/pages/UsersPage.jsx`

Components:

- `TaskLogGrid` — an editable Excel-like grid for daily task log entry at `resources/js/components/TaskLogGrid.jsx`.
- `Layout` — application layout and navigation at `resources/js/components/Layout.jsx`.

How it integrates with backend:

- Submitting task logs: POST `/api/task-logs` expects `{ date: "YYYY-MM-DD", rows: [{ start_time, end_time, duration_hours, description, kpi_category_id }] }`.
- Fetching evaluations: GET `/api/evaluations` (Auth required).
- Managing API keys: GET `/api/api-keys` (admin)
- Reporting: GET `/api/submissions/missing?date=YYYY-MM-DD` (admin)

Run the dev server:

```bash
npm install
npm run dev
```

Open the app (Laravel serves views) and open the root path; Vite will serve the frontend.

This scaffold is intentionally minimal — I can:

- Add a proper auth flow (login, token storage) and role-based UI visibility
- Add more polished UI components, forms, validation, and per-role dashboards
- Add E2E tests and Storybook for components

Which of these would you like next? (auth, UI polish, or more pages/components?)
