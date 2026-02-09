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

- Submitting task logs: POST `/api/task-logs` expects `{ date: "YYYY-MM-DD", rows: [{ start_time, end_time, description, kpi_category_id }] }` — `duration_hours` is computed by the server from `start_time`/`end_time`.
- Fetching evaluations: GET `/api/evaluations` (Auth required).
- Managing API keys: GET `/api/api-keys` (admin)
- Reporting: GET `/api/submissions/missing?date=YYYY-MM-DD` (admin)

Run the dev server:

```bash
npm install
npm run dev
```

Open the app (Laravel serves views) and open the root path; Vite will serve the frontend.

This scaffold now includes a basic SPA authentication flow (Laravel Sanctum-compatible), role-aware routing, and a `Login` page:

- `resources/js/contexts/AuthContext.jsx` — manages session via Sanctum (CSRF cookie + `/login` / `/logout`), exposes `user`, `login`, `logout`, and `hasRole()`.
- `resources/js/components/ProtectedRoute.jsx` — protects routes and enforces role requirements.
- `resources/js/pages/Login.jsx` — login form that redirects users to role-appropriate dashboards. The login page now includes client-side validation, inline error messages, a focused first input, accessible attributes and a loading spinner for better UX.

New session UX features:

- Automatic session refresh (background check every 5 minutes) to detect expiry and update the session status
- Toast notifications for login/logout and session expiry/warning
- Session indicator in the header showing last successful check time
- Re-auth modal and silent refresh attempts: when a session expires the client will try a silent refresh (CSRF cookie + fetch). If that fails, a modal pops up prompting the user to re-enter credentials without losing unsaved data. The modal can also be canceled which will cause a redirect to `/login` after a short timeout.

Remaining polish tasks:

- Add persistent session indicators, auto-refresh improvements, and re-auth flow enhancements
- Add E2E tests and Storybook for components

Which of these would you like next? (UI polish, session UX improvements, or E2E tests?)
