# DEPLOYMENT.md — Deployment & Environments
## Smart Campus Infrastructure Platform

Related: `ARCHITECTURE.md` §9, `SECURITY.md` §10

---

## 1. Environments

| Environment | Purpose | Data |
|---|---|---|
| **Local** | Individual development | Local/dev Supabase project or Dockerized Postgres |
| **Dev** | Shared integration testing among contributors | Seeded, disposable data |
| **Staging** | Pre-release validation, demo/capstone review | Seeded, production-like data (no real personal data) |
| **Production** | Live institutional use (if deployed beyond capstone) | Real data, strict access control |

Each environment uses **separate Supabase projects and credentials** — production secrets are never used in lower environments (`SECURITY.md` §10).

---

## 2. Hosting Layout

| Component | Hosting | Notes |
|---|---|---|
| Frontend (React/Vite static build) | Vercel | CDN-served static assets, environment-specific build (API base URL injected at build time) |
| Backend (FastAPI) | Docker container on Railway | Stateless — can scale horizontally behind a load balancer |
| Database / Auth / Storage / Realtime | Supabase managed cloud | No self-hosting required unless institutional policy demands it |

Vercel and Railway are the decided hosting targets (`DECISIONS.md` ADR-007, `master-prompt.md` Technology Stack) — not options among several alternatives.

---

## 3. Environment Variables

Backend (`.env`, never committed):
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
DATABASE_URL=
ALLOWED_CORS_ORIGINS=
ENV=local|dev|staging|production
```

Frontend (`.env`, build-time injected, never committed):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

`.env.example` files (with placeholder values, no real secrets) should be committed so contributors know what's required.

---

## 4. Build & Deploy Steps

### 4.1 Backend
1. Install dependencies (`pip install -r requirements.txt` or via Poetry, matching project setup)
2. Run migrations: `alembic upgrade head`
3. Start server: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (behind a process manager / container orchestrator in non-local environments)
4. Health check endpoint (`/health`) should be exposed for the hosting platform's readiness/liveness probes

### 4.2 Frontend
1. Install dependencies (`npm install`)
2. Build: `npm run build` (Vite production build, environment variables injected)
3. Deploy the `dist/` output to static hosting

### 4.3 Docker
- Backend `Dockerfile` builds a minimal Python 3.12 image running Uvicorn — this is the image deployed to Railway (§2), not an optional path.
- `docker-compose.yml` (local/dev only) can additionally spin up backend + local Postgres for contributors without a Supabase dev project.
- All environments still point at managed Supabase for Auth/Storage/Realtime; a Dockerized local Postgres, if used, only stands in for the database in local dev — never in dev/staging/production.

---

## 5. Database Migrations in Deployment

- Migrations run as a **separate step before** the new backend version starts serving traffic (never auto-migrate on app boot in production without review).
- Migrations must be backward-compatible with the currently running version during a rolling deploy (avoid dropping a column the old version still reads, for example) — expand/contract pattern for breaking schema changes.

---

## 6. Rollback Strategy

- Frontend: static hosting platforms typically support instant rollback to a previous build — use this for fast UI issue recovery.
- Backend: keep the previous container image tagged and deployable; rollback by redeploying the prior image.
- Database: migrations should be written with a corresponding downgrade path where feasible; irreversible migrations (e.g., destructive column drops) are deployed only after the corresponding application code no longer depends on the old shape.

---

## 7. Monitoring & Health Checks

- `/health` endpoint on the backend for uptime checks.
- Supabase dashboard provides DB/Auth/Storage/Realtime health and usage metrics.
- Audit logs (`DATABASE.md` §2.16) double as a lightweight activity monitor for unusual admin/booking activity.
- Consider basic uptime monitoring (e.g., a scheduled ping to `/health`) even at capstone scope, to catch outages during demos/grading windows.

---

## 8. Release Checklist

- [ ] All tests passing in CI (`TESTING.md` §4)
- [ ] Migrations reviewed and applied to target environment
- [ ] Environment variables confirmed for target environment (no dev secrets in staging/prod)
- [ ] Frontend build points at the correct API base URL
- [ ] Smoke test of priority flows (booking, complaint lifecycle, attendance) post-deploy
- [ ] Rollback plan confirmed before deploying to staging/production
