# backend.md
## Backend Development Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use for any FastAPI/Python work.

---

## Context

Backend stack: **FastAPI + Python 3.12 + SQLAlchemy 2 + Alembic + Pydantic v2 + Supabase Python SDK**, organized into domain services (Booking, Complaint, Attendance, Inventory, Notification, Audit Logging) per `ARCHITECTURE.md` §3.

Reference: `docs/API.md` (endpoint contracts), `docs/DATABASE.md` (schema), `RULES.md` §3 (backend rules), `docs/SECURITY.md`.

---

## Instructions for the AI Assistant

When generating or modifying backend code:

1. **Folder placement:** Organize by service domain (`services/booking/`, `services/complaint/`, etc.), each owning its routers, Pydantic schemas, and business logic. Shared dependencies (auth, DB session, config) go in `core/`.

2. **Validation:** All request/response bodies are Pydantic models. Never accept or return raw dicts from an endpoint handler.

3. **Authorization:** Every endpoint must declare and enforce its allowed roles via a shared auth dependency — check `docs/API.md`'s role column for the endpoint being implemented. Missing an RBAC check is treated as a bug, not an oversight to fix later.

4. **Conflict-sensitive operations** (bookings, events): implement the validation order from `RULES.md` §3.3 — resource active → no maintenance block → no overlapping confirmed booking → role permitted. Wrap the check-and-create in a transaction; rely on the DB exclusion constraint (`docs/DATABASE.md` §2.4) as a second line of defense, not the only one. Return `409` with the conflicting window on failure, matching `docs/API.md` §5's error shape.

5. **Schema changes:** Any model change requires a corresponding Alembic migration. Autogenerate, then manually review — autogenerate can miss constraints like exclusion constraints or check constraints, per `docs/DATABASE.md` §4.

6. **Audit logging:** Any state-changing endpoint (create/update/delete on bookings, complaints, inventory, users) must emit an audit log entry. Logging must not block or roll back the primary transaction on failure (`RULES.md` §3.4).

7. **Config/secrets:** Read all environment-specific values through the shared settings module. Never hardcode a Supabase key, JWT secret, or connection string.

8. **Async:** Use `async def` endpoints by default, consistent with the I/O-heavy nature of this app (DB + Supabase calls).

9. **Error responses:** Match the structured error shape in `docs/API.md` §1 — don't leak stack traces or raw DB errors to the client (`docs/SECURITY.md` §9).

---

## Checklist Before Returning Backend Code

- [ ] Pydantic models for all request/response bodies
- [ ] RBAC enforced per `docs/API.md`'s role column for this endpoint
- [ ] Conflict validation order followed for booking/event endpoints
- [ ] Migration created and manually reviewed for any schema change
- [ ] Audit log entry emitted for state-changing actions
- [ ] No hardcoded secrets/config
- [ ] Errors match the structured error response shape
