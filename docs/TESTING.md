# TESTING.md — Test Strategy
## Smart Campus Infrastructure Platform

Related: `RULES.md` §7, `ARCHITECTURE.md` §3, `API.md`

---

## 1. Testing Philosophy

- Critical-path logic (booking conflict detection, RBAC, complaint state transitions) is **non-negotiably tested** — it is the core value proposition of the platform (`PRD.md` §3 problem statement).
- Prefer a small number of high-value tests over exhaustive low-value coverage (e.g., don't snapshot-test every static UI element).
- Tests should be fast enough to run on every commit; slow/integration tests can run on a reduced schedule (e.g., pre-merge only).

---

## 2. Test Levels

### 2.1 Backend Unit Tests
- **Scope:** individual service functions (conflict-checking logic, status-transition validators, QR token generation/expiry logic).
- **Tooling:** `pytest`.
- **Target coverage areas:**
  - Booking Service: overlap detection at window edges (exact boundary touch is *not* a conflict; any overlap *is*), cancellation freeing a slot, maintenance-block exclusion.
  - Complaint Service: valid vs. invalid state transitions (e.g., cannot go from `submitted` directly to `verified`).
  - Attendance Service: expired token rejected, duplicate scan rejected, valid scan recorded once.

### 2.2 Backend Integration Tests
- **Scope:** full request/response cycle through FastAPI's test client against a test database.
- **Target coverage areas:**
  - Each endpoint: happy path (`2xx`) + at least one authorization failure (`403`) + at least one validation/conflict failure (`400`/`409`/`422`) — per `RULES.md` §7.
  - RBAC matrix: for each role, verify access is correctly granted/denied per `API.md` role column.
  - Concurrency test for booking creation: two near-simultaneous requests for an overlapping window — exactly one should succeed.

### 2.3 Database Tests
- Migration tests: `alembic upgrade head` runs cleanly against a fresh database in CI.
- Constraint tests: attempt to insert an overlapping confirmed booking directly at the DB layer — exclusion constraint (`DATABASE.md` §2.4) should reject it even if application logic is bypassed.

### 2.4 Frontend Tests
- **Component tests** (React Testing Library): forms validate correctly, role-gated components render/hide as expected per role.
- **Focus areas** (per `RULES.md` §7): role-gated rendering and form validation take priority over exhaustive snapshot testing.
- **Manual/exploratory testing** for calendar UI and real-time update behavior, given the interactive/visual nature of these features.

### 2.5 End-to-End (E2E) Tests
- **Tooling suggestion:** Playwright or Cypress.
- **Priority flows to cover:**
  1. Faculty books a classroom → conflict correctly blocks a second overlapping booking.
  2. Student submits a complaint → warden assigns → maintenance staff completes → student verifies (full lifecycle).
  3. Faculty generates attendance QR → student scans → attendance recorded and visible in reports.
- E2E suite runs against a seeded test environment, not production data.

---

## 3. Test Data & Environments

- A dedicated test/staging Supabase project (or local Postgres via Docker) is used for automated tests — never run destructive tests against production data.
- Seed fixtures provide: sample users per role, sample buildings/rooms, sample bookings in various states.
- Test data is reset between test runs to avoid cross-test contamination.

---

## 4. CI Expectations

- On every pull request:
  - Backend unit + integration tests run
  - Migration check (`alembic upgrade head` against a clean DB)
  - Frontend component tests run
  - Linting (backend: `ruff`/`flake8`; frontend: `eslint`) passes
  - Frontend type-checking (`tsc --noEmit`) passes — TypeScript is the required frontend language (`master-prompt.md` Technology Stack)
- E2E suite may run on a reduced cadence (e.g., pre-merge to `main` or nightly) if execution time is a constraint for the team.

---

## 5. Definition of Done — Testing Checklist (per feature)

Mirrors `RULES.md` §9, expanded:

- [ ] Unit tests for new business logic (especially conflict/state-transition rules)
- [ ] Integration test covering happy path + at least one failure case
- [ ] RBAC verified for all roles that touch the new endpoint(s)
- [ ] Frontend test for any new form validation or role-gated UI
- [ ] E2E flow updated/added if the feature affects a priority user journey
- [ ] No reduction in existing test suite pass rate

---

## 6. Known Risk Areas Requiring Extra Test Attention

| Area | Why |
|---|---|
| Booking/event overlap detection | Core invariant of the platform; race conditions are easy to introduce |
| QR attendance replay/expiry | Security-relevant, easy to get subtly wrong |
| Complaint state machine | Multiple roles touch it; invalid transitions must be blocked |
| RBAC on every new endpoint | Easiest thing to forget when adding a route |
| File upload validation | Security-relevant (type/size checks) |
