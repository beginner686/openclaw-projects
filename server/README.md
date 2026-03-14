# OpenClaw Backend Architecture (MySQL)

## Structure

- `index.js`: backend bootstrap entry.
- `src/app.js`: dependency wiring, middleware and route mounting.
- `src/config/`: environment, paths, module catalog, execution rules.
- `src/repositories/`: MySQL data access layer.
- `src/services/`: auth, task engine, report generation, dashboard assembly.
- `src/middleware/`: auth guard.
- `src/routes/`: auth/customer/module/report HTTP interfaces.
- `data/reports/`: generated report files.

## Environment

Set these variables before starting server:

- `MYSQL_HOST` (default `127.0.0.1`)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_USER` (default `root`)
- `MYSQL_PASSWORD` (default empty)
- `MYSQL_DATABASE` (default `openclaw`)
- `OPENCLAW_JWT_SECRET`
- `OPENCLAW_REPORT_SECRET`
- `OPENCLAW_PASSWORD_PEPPER`
- `OPENCLAW_MAX_TASK_ROWS` (default `3000`)
- `OPENCLAW_CLEANUP_INTERVAL_MS` (default `300000`)

In production (`NODE_ENV=production`), backend will fail fast if required secrets are missing.

The server will auto-create database/tables if missing.

## Run

```bash
npm run dev:server
```

Default server port: `4000` (from `server/.env`).

## V1 Unified APIs

Base path: `/api/v1`

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/profile`
- `GET /api/v1/dashboard`
- `GET /api/v1/menus`
- `GET /api/v1/roles`
- `GET /api/v1/permissions`
- `GET /api/v1/modules`
- `GET /api/v1/modules/:code`
- `POST /api/v1/modules/:code/open`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `POST /api/v1/tenants`
- `POST /api/v1/tenants/:id/package`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `GET /api/v1/tasks/:id/logs`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `GET /api/v1/messages`
- `POST /api/v1/messages/read`
- `GET /api/v1/packages`
- `GET /api/v1/packages/:id`
- `POST /api/v1/packages`
- `GET /api/v1/reports`
- `GET /api/v1/reports/:id`
- `GET /api/v1/reports/:id/export`
- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `GET /api/v1/health`

Success response format:

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## Seed Accounts

- `admin` / `123456`
- `demo` / `123456`
- `readonly` / `123456`

## Core APIs

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/profile`
- `GET /api/customer/dashboard`
- `GET /api/modules`
- `GET /api/modules/:moduleKey/history`
- `POST /api/modules/:moduleKey/tasks`
- `GET /api/modules/:moduleKey/tasks/:taskId`
- `GET /reports/:fileName` (requires bearer token or signed report access token)
