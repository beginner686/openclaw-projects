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
