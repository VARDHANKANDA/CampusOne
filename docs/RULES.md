# RULES.md — AI Configuration & Development Guidelines
## Smart Campus Infrastructure Platform

This document configures how an AI coding assistant (or any contributor) should work within this codebase. It defines conventions, boundaries, and quality bars so generated code stays consistent with the project's architecture and intent. Treat this as binding project policy, not suggestions.

---

## 1. Project Context (Read First)

- **Stack:** React 19 + TypeScript (Vite) + Tailwind frontend · FastAPI (Python 3.12, Pydantic v2, SQLAlchemy 2) backend · Supabase (PostgreSQL, Auth, Storage, Realtime) — see `master-prompt.md`'s Technology Stack table for the authoritative version pins
- **Domain:** Role-based campus operations platform (bookings, complaints, attendance, inventory, events)
- **Core invariant:** No two confirmed bookings may overlap for the same room/lab/venue. Every scheduling feature must respect this.
- Refer to `PRD.md` for requirements and `ARCHITECTURE.md` for system structure before implementing new features.

---

## 2. General Principles

1. **Backend is the source of truth.** Never trust client-side validation for booking conflicts, role permissions, or state transitions — always re-validate server-side.
2. **Role-based access control (RBAC) is enforced at the API layer**, not just hidden in the UI. Every endpoint must check the caller's role before executing.
3. **Prefer explicit over clever.** This is a multi-contributor capstone project — code should be readable by teammates, not just correct.
4. **Small, reviewable changes.** Generate one module/feature at a time; avoid sprawling multi-module commits.
5. **Match existing patterns.** Before introducing a new pattern (e.g., a new state-management approach, a new folder layout), check if an existing convention already solves it.

---

## 3. Backend Rules (FastAPI / Python)

### 3.1 Structure
- Organize by **service domain**, not by technical layer: `services/booking/`, `services/complaint/`, `services/attendance/`, `services/inventory/`, `services/notification/`, `services/audit/`.
- Each service owns its routers, schemas (Pydantic models), and business logic.
- Shared utilities (auth dependency, DB session, config) live in `core/`.

### 3.2 Coding Standards
- All request/response bodies are defined as **Pydantic models** — no raw dicts in/out of endpoints.
- Use **SQLAlchemy** models + **Alembic** migrations for all schema changes. Never hand-edit the database schema without a migration.
- Every write endpoint that touches bookings, complaints, or inventory must be wrapped in a transaction to prevent race conditions (especially booking conflict checks — use `SELECT ... FOR UPDATE` or equivalent locking where relevant).
- Async endpoints by default (`async def`) since this app is I/O-heavy (DB + Supabase calls).
- Environment/config values go through a single settings module (`core/config.py`) reading from environment variables — **never hardcode secrets, Supabase keys, or JWT secrets.**

### 3.3 Validation & Conflict Detection
- Booking/reservation endpoints must validate, in this order:
  1. Requested resource exists and is active (not decommissioned)
  2. No maintenance block overlaps the requested time window
  3. No existing confirmed booking overlaps the requested time window
  4. Requesting user's role is permitted to book this resource type
- Reject with a clear 409 Conflict (not a generic 400) when a scheduling conflict is detected, and include the conflicting booking's time window in the error payload for UI display.

### 3.4 Audit Logging
- Any state-changing action on bookings, complaints, inventory, or admin/user management **must** emit an audit log entry (actor, action, entity, before/after where relevant, timestamp).
- Audit logging must not block or fail the primary transaction — log asynchronously or in a way that doesn't roll back the main operation on logging failure.

---

## 4. Frontend Rules (React / Vite)

### 4.1 Structure
- All frontend code is **TypeScript** (`.ts`/`.tsx`) — no plain JavaScript files. Component props, hook return values, and API response shapes are all typed; avoid `any`.
- Feature-based folder structure: `features/booking/`, `features/complaints/`, `features/attendance/`, etc., each with its own components, hooks, and API calls.
- Shared UI primitives (buttons, inputs, modals) live in `components/ui/`.
- Use **TanStack Query** for all server-state (fetching bookings, complaints, etc.) — do not duplicate server state into local component state or a global store.
- Use **React Hook Form** for all forms; validate with a schema (e.g., zod) matching the backend Pydantic model shape.

### 4.2 Role-Aware UI
- UI must reflect the current user's role (hide/disable actions the role can't perform), but this is a UX convenience only — **it is never a substitute for backend authorization**.
- Route guards should redirect unauthorized roles away from pages, not just hide buttons.

### 4.3 Styling
- Tailwind utility classes only; avoid ad-hoc inline styles or separate CSS files unless a Tailwind utility genuinely can't express it.
- Keep design consistent with whatever design tokens/theme the project has established — don't introduce a new color palette or spacing scale per component.

### 4.4 Real-time Updates
- Use Supabase Realtime subscriptions for live status changes (booking confirmations, complaint status, notifications) — don't build custom polling unless Realtime genuinely can't cover the case.
- Clean up subscriptions on component unmount to avoid leaks.

---

## 5. Database Rules (Supabase / PostgreSQL)

- All tables use UUID primary keys (Supabase convention).
- Every table with user-editable data has `created_at` and `updated_at` timestamps.
- Foreign keys are enforced at the DB level, not just application level.
- **Row-Level Security (RLS)** should be enabled on Supabase tables as a defense-in-depth layer, even though FastAPI is the primary authorization gate — don't rely on RLS alone, and don't skip it either.
- Sensitive tables (audit logs) are append-only — no update/delete permissions granted to application roles beyond the service role.

---

## 6. Security Rules

- Never commit `.env` files, Supabase service keys, or JWT secrets to version control.
- All file uploads (complaint images, lost & found photos, completion photos) must be validated for type/size and stored via Supabase Storage — never store raw file paths from client input directly.
- Passwords/auth are fully delegated to Supabase Auth — do not implement custom password hashing or storage.
- Rate-limit sensitive endpoints (login, password reset, QR generation) to reduce abuse.
- QR attendance codes must be short-lived and single-purpose (tied to a specific session) to prevent replay/sharing.

---

## 7. Testing Expectations

- New backend endpoints require at least one test covering the "happy path" and one covering a rejection/conflict case (e.g., double-booking attempt).
- Booking conflict logic is considered **critical path** — it must have dedicated test coverage for overlapping time windows, edge-of-window boundaries, and cancellation freeing up a slot.
- Frontend: prioritize testing role-gated rendering and form validation over exhaustive UI snapshot tests.

---

## 8. What the AI Assistant Should NOT Do

- Do not invent new user roles beyond the five defined (Student, Faculty, Hostel Warden, Maintenance Staff, Administrator) without an explicit product decision.
- Do not bypass backend validation "for now" — booking conflict and RBAC checks are not optional scaffolding to add later.
- Do not introduce a new state management library, ORM, or major dependency without flagging it as a decision point first.
- Do not generate placeholder/mock data logic that could be mistaken for production logic (e.g., no `# TODO: fake for now` booking validation that silently always returns true).
- Do not log or expose sensitive personal data (student records, contact info) in error messages, logs, or client-facing responses.

---

## 9. Definition of Done (per feature)

A module/feature is complete when:
- [ ] Backend endpoint(s) implemented with Pydantic validation
- [ ] Role-based authorization enforced server-side
- [ ] Relevant conflict/business-rule validation implemented and tested
- [ ] Audit log entries emitted for state changes
- [ ] Frontend UI implemented with role-aware rendering
- [ ] Real-time updates wired where applicable (Supabase Realtime)
- [ ] Basic tests written for happy path + at least one failure/conflict case
- [ ] No secrets or hardcoded config committed
