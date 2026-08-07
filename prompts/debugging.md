# debugging.md
## Debugging Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use whenever investigating a bug, unexpected behavior, failing test, or production incident.

---

## Context

Reference: `ARCHITECTURE.md` (service boundaries and data flow), `docs/DATABASE.md` (schema/constraints), `docs/API.md` (contracts), `docs/SECURITY.md`, `docs/TESTING.md` §6 (known risk areas), `docs/DECISIONS.md` (why the system is built this way — check before "fixing" something that's actually intentional).

---

## Instructions for the AI Assistant

### 1. Localize before touching code

Identify which service domain the bug lives in (Booking, Complaint, Attendance, Inventory, Notification, Audit Logging — per `ARCHITECTURE.md` §3) and which layer (frontend, API, database, Supabase platform). Don't start editing across multiple layers speculatively — narrow down first.

### 2. Reproduce with the smallest possible case

- For a booking/scheduling bug: reproduce with a single request against a known room/time window before assuming it's a concurrency issue.
- For an RBAC bug: reproduce with the specific role + endpoint pair, checking it against `docs/API.md`'s role column for what *should* happen.
- For a UI bug: check whether it's a rendering issue, a stale TanStack Query cache issue, or an actual API response problem — inspect the network response before assuming the frontend is wrong.

### 3. Check the known risk areas first

Per `docs/TESTING.md` §6, these are the platform's historically fragile spots — check them first if the symptom is anywhere nearby:

| Symptom | Likely area |
|---|---|
| Two bookings/events overlap, or a valid booking is rejected | Booking Service conflict logic, or the DB exclusion constraint (`docs/DATABASE.md` §2.4) — check both the app-layer check and the constraint itself |
| A user can see/do something their role shouldn't | Missing or misordered RBAC check on the endpoint — verify against `docs/API.md`'s role column, and check for a missing ownership check (`prompts/auth.md` §4) |
| Complaint stuck in wrong status, or an invalid transition succeeded | Complaint Service state-machine validation |
| Attendance recorded twice, or after expiry | QR token expiry check, or the `UNIQUE(session_id, student_id)` constraint (`docs/DATABASE.md` §2.11) not being enforced/handled |
| Booking succeeds but no audit log entry appears | Audit Logging Service call missing or silently failing — but confirm the primary transaction still succeeded (logging failures should never roll back the main action, per `RULES.md` §3.4) |
| Realtime updates not appearing in the UI | Supabase Realtime subscription not wired, wrong channel scope, or subscription cleaned up too early on unmount |
| File upload broken or serving wrong content | Supabase Storage bucket/reference mismatch — confirm the DB stores a reference, not a raw client-supplied path (`docs/SECURITY.md` §3) |

### 4. Distinguish "bug" from "intentional design"

Before changing behavior, check `docs/DECISIONS.md` — some things that look like bugs are deliberate (e.g., unified `rooms` table behavior per ADR-003, or strict RBAC rejecting something a tester expected to work). If the fix would contradict a recorded decision, surface that conflict rather than silently reversing it.

### 5. Fix at the right layer

- If a bug can be prevented by a database constraint, prefer adding/fixing the constraint over only patching application logic (defense-in-depth, per `RULES.md` §3.3 and `docs/DATABASE.md` §2.4).
- If a bug is an RBAC gap, fix it server-side first — a frontend-only fix (hiding a button) does not close the actual vulnerability (`docs/SECURITY.md` §2).
- Don't fix a symptom in the frontend that's actually caused by an incorrect API response — trace back to the source.

### 6. Concurrency issues

For anything booking/event/attendance related, consider whether the bug only appears under concurrent requests before concluding it's a simple logic error. Reproduce with near-simultaneous requests if the symptom is intermittent or "only happens sometimes."

### 7. Add a regression test

Once the root cause is found, add a test that would have caught it (per `docs/TESTING.md`) — a boundary-case test for conflict logic, an RBAC-matrix test for an authorization gap, a state-transition test for the complaint workflow, etc. A bug fix without a regression test is incomplete.

### 8. Never expose debug detail to end users

Stack traces, raw SQL errors, and internal file paths stay in server-side logs only. Client-facing error messages remain generic and mapped to the structured error shape in `docs/API.md` §1, per `docs/SECURITY.md` §9 — even while actively debugging, don't temporarily leak internals into a response and forget to revert it.

---

## Debugging Checklist

- [ ] Reproduced with the smallest possible case
- [ ] Localized to a specific service/layer before editing code
- [ ] Checked the known risk areas table above for a matching pattern
- [ ] Confirmed this isn't intentional behavior per `docs/DECISIONS.md`
- [ ] Fixed at the correct layer (DB constraint / server-side RBAC / source of truth), not just patched the symptom
- [ ] Considered whether the bug is concurrency-related
- [ ] Added a regression test covering the root cause
- [ ] Confirmed no debug/internal detail leaks into client-facing responses
