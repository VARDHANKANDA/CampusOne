# Smart Campus Infrastructure Platform

Centralized, role-based web application for digitizing university campus operations — classroom/lab booking, hostel complaints, maintenance, equipment inventory, lost & found, QR attendance, event scheduling, notifications, and reporting.

Full specification lives in [`docs/`](docs/); AI/contributor working conventions live in [`prompts/`](prompts/). Start with [`prompts/master-prompt.md`](prompts/master-prompt.md).

## Stack

React 19 + TypeScript + Vite + Tailwind CSS (frontend) · FastAPI + Python 3.12 + SQLAlchemy 2 + Alembic (backend) · Supabase PostgreSQL/Auth/Storage · Docker.

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker Desktop (for the local Postgres fallback, and to build the backend image)
- A Supabase project (or use the Dockerized local Postgres for DB-only work — Auth/Storage still require a Supabase project, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
copy .env.example .env   # fill in Supabase/DB values
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env   # fill in Supabase/API values
npm run dev
```

### Docker (local Postgres + backend)

```bash
docker compose up --build
```

## Quality Gates

| Check | Backend | Frontend |
|---|---|---|
| Lint | `ruff check .` | `npm run lint` |
| Format | `black --check .` | `npm run format:check` |
| Type-check | `mypy app` | `npm run typecheck` |
| Tests | `pytest` | `npm run test` |
| Build | — | `npm run build` |

CI runs all of the above on every pull request — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Repository Layout

```
backend/    FastAPI application, Alembic migrations, backend tests
frontend/   React + TypeScript SPA
docs/       Product/engineering specification (source of truth)
prompts/    AI assistant working prompts
```
