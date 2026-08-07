# DECISIONS.md — Architecture Decision Records (ADR)
## Smart Campus Infrastructure Platform

This log records significant technical/product decisions, the alternatives considered, and the reasoning — so future contributors (and the AI assistant) understand *why* the system looks the way it does, not just *what* it looks like.

**Format:** Each entry is numbered, dated, and includes Context → Decision → Alternatives Considered → Consequences.

---

## ADR-001: Use Supabase as the managed backend platform (DB + Auth + Storage + Realtime)

**Date:** Project inception
**Status:** Accepted

**Context:** The project needs a relational database, authentication, file storage, and real-time update delivery, within a 4–6 month capstone timeline with a small team.

**Decision:** Use Supabase to provide PostgreSQL, Authentication, Storage, and Realtime, rather than building/self-hosting each independently.

**Alternatives Considered:**
- Self-hosted Postgres + custom JWT auth + S3-compatible storage + a self-built WebSocket layer — more control, but significantly more implementation and operational overhead for a capstone timeline.
- Firebase — good real-time/auth support, but weaker fit for a relational data model with strong consistency needs (booking conflicts).

**Consequences:** Faster delivery of auth/storage/realtime; some vendor lock-in to Supabase-specific features (RLS syntax, Realtime channel model). Institutional self-hosting requirements (if any) would require future migration work.

---

## ADR-002: Backend is the sole authority for booking conflict validation (never trust client-side checks)

**Date:** Project inception
**Status:** Accepted

**Context:** Double-booking is the platform's core problem to solve (`PRD.md` §3). Client-side-only validation is trivially bypassable and unsafe under concurrent requests.

**Decision:** All conflict/availability validation happens server-side in the Booking Service, backed by a database-level exclusion constraint as a second line of defense (`DATABASE.md` §2.4).

**Alternatives Considered:**
- Client-side validation only with optimistic UI — rejected, insufficient guarantee under concurrency.
- Application-layer locking only, without a DB constraint — rejected as insufficiently defensive; a constraint catches bugs that slip past application logic.

**Consequences:** Slightly more complex booking-creation code path (transaction + constraint), but eliminates an entire class of race-condition bugs.

---

## ADR-003: Unified `rooms` table for classrooms, labs, and venues (rather than separate tables)

**Date:** Project inception
**Status:** Accepted

**Context:** Classrooms, labs, and event venues (auditoriums/seminar halls) share nearly identical attributes (building, capacity, equipment) and booking/conflict logic.

**Decision:** Model them as a single `rooms` table with a `type` enum, rather than three separate tables.

**Alternatives Considered:**
- Separate `classrooms`, `labs`, `venues` tables — rejected due to logic/schema duplication and more complex cross-type availability queries.

**Consequences:** Simpler booking/conflict logic reused across classroom booking, lab reservation, and event scheduling modules. If room types diverge significantly in the future (very different attributes), this may need to be revisited.

---

## ADR-004: RBAC enforced server-side per endpoint; frontend role-based UI is convenience only

**Date:** Project inception
**Status:** Accepted

**Context:** A role-based system is only as secure as its weakest enforcement point.

**Decision:** Every API endpoint explicitly declares allowed roles and enforces them server-side (`SECURITY.md` §2). Frontend hides/disables UI per role for usability, but this is never treated as a security boundary.

**Alternatives Considered:**
- Relying primarily on frontend route guards — rejected as insecure (trivially bypassed via direct API calls).

**Consequences:** Slightly more boilerplate per endpoint (role-check dependency), but a much stronger security posture.

---

## ADR-005: QR attendance tokens are short-lived and session-scoped

**Date:** Project inception
**Status:** Accepted

**Context:** Static or long-lived QR codes are easily shared/photographed and reused for proxy attendance.

**Decision:** Each attendance session generates a unique, expiring QR token; scans are validated for expiry and uniqueness per student per session (`DATABASE.md` §2.10–2.11, `SECURITY.md` §6).

**Alternatives Considered:**
- Static per-course QR code — rejected, trivially shareable.
- Manual roll-call only — rejected, defeats the purpose of digitizing attendance.

**Consequences:** Slightly more complex session-management UI for faculty (must generate a fresh code per session), but substantially reduces attendance fraud.

---

## ADR-006: Pin exact stack versions — React 19 + TypeScript, Python 3.12, Pydantic v2, SQLAlchemy 2

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `ARCHITECTURE.md` and `RULES.md` originally described the stack in unversioned terms ("React.js (Vite)", "Python", "Pydantic", "SQLAlchemy"), while `master-prompt.md`'s Technology Stack table specifies exact versions (React 19, TypeScript, Python 3.12, Pydantic v2, SQLAlchemy 2). Unversioned references risk silently drifting toward an older/untyped stack (e.g., plain JavaScript instead of TypeScript) as contributors fill gaps with defaults.

**Decision:** `master-prompt.md`'s Technology Stack table is the single source of truth for versions. All frontend code is TypeScript, no plain `.js`/`.jsx`. `ARCHITECTURE.md`, `RULES.md`, and the domain prompts (`frontend.md`, `backend.md`) are updated to state these versions explicitly rather than leaving them implicit.

**Alternatives Considered:**
- Leave versions unstated and let each contributor/AI session infer them — rejected, this is exactly how a JavaScript file or an old Pydantic v1 pattern would slip in unnoticed.

**Consequences:** Slightly more maintenance burden to keep version references in sync across documents when the stack is deliberately upgraded in the future, but eliminates ambiguity about what "the stack" means. A future stack upgrade must update `master-prompt.md` first, then propagate to dependent documents and log a superseding ADR here.

---

## ADR-007: Firm deployment targets — Vercel (frontend) + Railway (backend via Docker)

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `ARCHITECTURE.md` §9 and `DEPLOYMENT.md` §2 originally listed hosting as "suggested," hedging between Vercel/Netlify for the frontend and Render/Railway/Fly.io/a university server for the backend. `master-prompt.md`'s Technology Stack table already names Docker, Docker Compose, Vercel, and Railway as the deployment stack — the hedged language in other documents was stale relative to that decision.

**Decision:** Frontend deploys to Vercel; backend deploys as a Docker container to Railway; Docker Compose remains available for local/dev convenience only. This is the decided deployment path, not one option among several.

**Alternatives Considered:**
- Netlify (frontend) — comparable to Vercel for a static Vite build; no differentiating requirement favored it, so it was dropped in favor of a single named target to avoid divergent environment-specific tooling across contributors.
- Render / Fly.io / self-hosted university server (backend) — all viable Docker hosts, but leaving multiple named options in the docs invited environment drift (different logging/health-check conventions, different env-var injection mechanics per platform). Railway was picked as the single target for a small capstone team.

**Consequences:** `ARCHITECTURE.md` §9 and `DEPLOYMENT.md` §§2, 4.3 now state Vercel/Railway directly instead of "suggested" alternatives. Institutional self-hosting, if required later, would need a new ADR superseding this one.

---

## ADR-008: Restructure PRD module taxonomy into 14 first-class modules

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `master-prompt.md`'s Project Identity section explicitly lists 14 primary modules and states that "Notification Center, Reports & Analytics, and Admin Panel are first-class modules in their own right — not sub-features folded into 'Dashboard.'" `PRD.md` §5 originally defined only 10 modules, with Dashboard, Notifications, Reports & Analytics, Audit Logs, and Admin Panel management collapsed into a single "Module 10 — Dashboard & Analytics" section (or, for Admin Panel and Audit Logs, left without a dedicated FR section at all despite having DB tables, API endpoints, and UI information architecture already defined elsewhere).

**Decision:** Split former Module 10 into five explicit modules — 10: Dashboard (role-specific landing experience), 11: Notification Center, 12: Reports & Analytics, 13: Audit Logs, 14: Admin Panel — each with its own FR-x.y requirements in `PRD.md` §5. Modules 1–9 keep their existing numbers and FR IDs unchanged, since `UI_UX.md` and `SECURITY.md` already reference specific FR IDs from that range (e.g., FR-5.3, FR-6.3/6.4). The Release Plan (`PRD.md` §9) is updated so all 14 modules are accounted for across phases.

**Alternatives Considered:**
- Leave Dashboard/Notifications/Reports/Admin Panel implicit within other modules' requirements — rejected; it contradicted `master-prompt.md`'s explicit instruction and left Admin Panel and Audit Logs (both of which already have dedicated DB tables and API endpoints) with no formal functional requirements to trace back to, violating the "every functional requirement traceable to a role and a module" quality bar.
- Renumber all 14 modules to match the exact order they appear in `master-prompt.md`'s list — rejected; it would have broken existing FR-x.y cross-references in `UI_UX.md` and `SECURITY.md` for no material benefit, since module order carries no semantic meaning beyond grouping.

**Consequences:** `PRD.md` now has 14 modules matching `master-prompt.md` exactly. New FR-11.6/FR-14.4 (admin-configurable email notification settings) introduced a small new surface: `notification_settings` table (`DATABASE.md` §2.15) and `/admin/notification-settings` endpoints (`API.md` §12).

---

## ADR-009: Background-task writers (audit logs, notifications) use a dedicated DB session, never the request's own session

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `RULES.md` §3.4 requires audit logging to "not block or fail the primary transaction — log asynchronously or in a way that doesn't roll back the main operation on logging failure," but doesn't specify the mechanism. FastAPI's `BackgroundTasks` run after the response is prepared but still within the same request lifecycle; if the audit-log write reused the request's own `Session` (from `get_db`), a failure in that write could still interact with a session whose transaction state the primary handler no longer controls, and by the time the background task runs, `get_db`'s `finally: db.close()` may have already released it.

**Decision:** `app/services/audit/service.py::record_audit_log` and `app/services/notification/service.py::queue_notification`/`promote_waitlist` each open their own `SessionLocal()` inside the background task, commit or log-and-swallow any exception, and close it themselves — completely independent of the request's `db` session. Every write-endpoint pattern in this codebase follows: primary transaction commits and returns first (via the request's own session), *then* `background_tasks.add_task(...)` schedules the audit/notification write on a fresh session.

**Alternatives Considered:**
- Pass the request's `db` session into the background task — rejected; `get_db`'s generator closes the session once the response starts, so the session would be invalid by the time the background task runs, and even if it weren't, a background failure could taint a session the request handler still (theoretically) owns.
- Write audit logs synchronously in the same transaction as the primary action — rejected; a constraint violation or trigger failure in the audit write would roll back the primary action too, which directly contradicts `RULES.md` §3.4.

**Consequences:** Every router that emits an audit log or notification follows this exact shape (commit primary → `background_tasks.add_task`), which became the template copied into all 14 modules. A logging/notification failure is only ever visible in server logs (`logger.exception(...)`), never surfaced to the client or capable of rolling back a user-facing action.

---

## ADR-010: Backend proxies Supabase Auth for register/login/logout/password-reset; self-registration always creates a `student` account

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `API.md` §2 documents `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/password-reset` as endpoints on our own FastAPI surface, but `DEPLOYMENT.md` §3 only gives the backend `SUPABASE_SERVICE_KEY` (no anon key) — the frontend separately gets `VITE_SUPABASE_ANON_KEY`. Neither document specified whether the frontend should call Supabase Auth directly or go through our backend, nor what role a self-registering user receives. Both were required implementation-time decisions.

**Decision:**
1. The FastAPI backend implements all four endpoints itself, calling the Supabase Auth Admin API with the service-role key (`app/core/supabase.py`, `app/services/auth/router.py`). The frontend never talks to Supabase directly for these flows — it only calls our own `/api/v1/auth/*` contract, matching what `API.md` documents. `VITE_SUPABASE_ANON_KEY` is reserved for later modules that need direct client-side Supabase access (Realtime subscriptions in Module 11 — Notification Center; Storage signed uploads).
2. `POST /auth/register` always creates a `student`-role account. There is no role field on the registration request. Every other role (`faculty`, `warden`, `maintenance_staff`, `admin`) is assigned exclusively by an admin via `PATCH /users/{id}` (Module 14 — Admin Panel). This closes an obvious privilege-escalation hole: without it, anyone could self-register as `admin`.

**Alternatives Considered:**
- Frontend calls Supabase Auth directly via `supabase-js` (the more common Supabase pattern, gets session refresh/PKCE for free) — rejected for now because `API.md` already documents these as our own REST endpoints, and a client-supplied role at signup would be an unreviewed security hole either way. This can be revisited if refresh-token handling on the backend proxy proves cumbersome; would need a corresponding `API.md` update if reversed.
- Letting registration accept an arbitrary role field, validated against an allowlist — rejected; even a validated allowlist still lets a self-registering user grant themselves `faculty` or worse, which is not appropriate for campus-operations software.

**Consequences:** `RegisterRequest` (backend) and the register form (frontend) both omit a role field entirely — this is intentional, not an oversight. Admin-driven role assignment becomes a hard dependency for onboarding any non-student user, which is already the expected workflow per `PRD.md` FR-14.1.

---

## ADR-011: Accept the react-router `react-router-dom@7.x` CSRF advisory as not applicable to this app's usage

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `npm audit` flags `react-router` (a transitive dependency of `react-router-dom@7.18.2`) for GHSA-qwww-vcr4-c8h2, an "RSC Mode CSRF Bypass Allows Action Execution Before 400 Response." The only published fix requires the new `react-router@8.x` package line, which consolidates `react-router-dom` into a single package built around React Server Components and framework-mode routing — a materially different, very new (weeks-old) major version.

**Decision:** Stay on `react-router-dom@7.18.2` for now. The advisory's attack surface is React Router's RSC/server-actions mode; this app is a pure client-side SPA using only declarative `BrowserRouter`/`Routes`/`Route` (no `<Form>`, no loaders/actions, no server rendering), so the vulnerable code path is never invoked. Forcing a migration to a days-old major version built around a rendering model (RSC) we don't use would trade a non-applicable risk for real stability risk on a foundational dependency.

**Alternatives Considered:**
- Migrate to `react-router@8.x` immediately — rejected for now; the API surface changed enough (package consolidation, RSC-first exports) that it needs its own reviewed migration, not a reflexive `npm audit fix --force` during scaffolding.

**Consequences:** `npm audit` will continue to report this advisory until either React Router backports a patch to a 7.x release or the team schedules a deliberate v8 migration. Revisit this ADR if that migration happens — mark it superseded and reference `frontend.md`'s routing conventions if they change as a result.

---

## ADR-012: Room-level `requires_approval` flag decides whether a booking auto-confirms or needs admin approval

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `PRD.md` FR-2.6 says "Admin can approve/reject bookings where approval is required," and `ARCHITECTURE.md` §5.1 describes a booking being "created as `confirmed` (or `pending` if approval required)" — but neither document states *which* bookings require approval. `DATABASE.md` §2.4 and `API.md` §5 both already model `pending`/`confirmed`/`rejected` as real states with real endpoints (`PATCH /bookings/{id}/approve`, `/reject`), so leaving the trigger condition unspecified would mean implementing dead code paths that nothing ever reaches — every booking would auto-confirm and `pending`/approve/reject would be unreachable.

**Decision:** Add `rooms.requires_approval` (`BOOLEAN DEFAULT false`, admin-editable via `PATCH /rooms/{id}`). A booking request for a room with `requires_approval = true` is created as `pending` and needs `PATCH /bookings/{id}/approve` (which re-runs the full conflict check before confirming, since time may have passed) to become `confirmed`; every other room's bookings validate and auto-confirm in the same request. This makes the "where approval is required" language in FR-2.6 a literal, admin-controlled setting rather than an unstated global rule, keeps the default flow frictionless per `PRD.md` §1's goal of eliminating manual booking workflows, and makes every state/endpoint in the existing schema and API contract actually reachable.

**Alternatives Considered:**
- All bookings auto-confirm, full stop — rejected; leaves `pending`/approve/reject fully unreachable despite being documented in `API.md` and `DATABASE.md`.
- All bookings start `pending` and always need admin approval — rejected; contradicts the "where approval is required" (conditional) phrasing in FR-2.6 and adds friction to every single booking, which works against the platform's stated purpose.
- Approval keyed off room *type* (e.g., auditoriums always need approval) — rejected; auditoriums/seminar halls are booked through the separate `events` table (Module 10 — Event Scheduling), not `bookings`, so a type-based rule wouldn't actually apply to any row in this table.

**Consequences:** `rooms` gained one column (`requires_approval`, migration `0001_initial_schema.py`, defaulted `false` so existing seed/test data is unaffected). Lab Reservation (Module 4) reuses the same `bookings` table and therefore the same flag/flow — a lab room can also be marked `requires_approval` if a department wants that.

---

## ADR-013: Booking ownership (list/view/cancel) is opened to students, not just faculty; waitlist join requires an actual conflict; FR-3.4 notification deferred to Module 11

**Date:** 2026-08-06
**Status:** Accepted

**Context:** Building Module 4 (Lab Reservation) surfaced three gaps in the existing contract:
1. `API.md` §5 originally scoped `GET /bookings`, `GET /bookings/{id}`, and `PATCH /bookings/{id}/cancel` to "faculty (own), admin (all)." But `PRD.md` FR-3.2 lets *students* reserve labs, and `UI_UX.md` §4 gives students a "My Bookings" nav item — with the original role scoping, a student could reserve a lab but never see or cancel it through the documented API.
2. `PRD.md` FR-3.3 says users "join a waiting list when a lab session is full" but never states what stops someone from waitlisting a slot that's actually open right now.
3. `PRD.md` FR-3.4 ("waiting-list users receive an approval notification when a slot opens") depends on the Notification Center, which is Module 11 — not yet built when Module 4 lands.

**Decision:**
1. `GET /bookings`, `GET /bookings/{id}`, and `PATCH /bookings/{id}/cancel` are owner-scoped for *any* role (student or faculty), not just faculty — a student only ever owns lab bookings, since classroom booking creation (`POST /bookings`) stays faculty-only. `API.md` §5 updated accordingly.
2. `POST /labs/waitlist` requires `find_conflict` to actually return a conflict for the requested room+window; otherwise it 400s with `SLOT_AVAILABLE` and tells the caller to reserve directly. This keeps the waitlist meaning what its name says instead of becoming a second way to reserve an open slot.
3. Notifying a waitlisted user when their slot opens is explicitly deferred to Module 11. The integration point is marked with a code comment in `PATCH /bookings/{id}/cancel` (`app/services/booking/router.py`) rather than half-built (e.g., no `notified_at` timestamp is set by anything yet, since nothing would ever act on it before Module 11 exists).

**Alternatives Considered:**
- A dedicated `GET /labs/reservations` endpoint scoped to students, kept separate from `GET /bookings` — rejected; `bookings` is already the single source of truth for both classroom and lab reservations (`DECISIONS.md` ADR-003), and a parallel endpoint would just be the same query with a different name.
- Letting `POST /labs/waitlist` succeed regardless of availability (always enqueue) — rejected; makes the waitlist redundant with just reserving the slot, and pollutes `GET /labs/waitlist/{room_id}` with entries for rooms that were never actually contested.
- Stubbing a fake/no-op notification call now instead of a comment — rejected per `RULES.md` §8 ("no placeholder/mock data logic that could be mistaken for production logic"); a comment marking the integration point is honest about what's actually implemented.

**Consequences:** `UI_UX.md` §4 gained "Reserve Lab" in the Student IA (it was already present for Faculty; the student entry was a documentation gap, now fixed). Module 11 must read this ADR before implementing waitlist notifications, since the trigger point is already identified.

---

## ADR-014: `complaints.completion_image_url` is a separate column from `image_url`; the complaint workflow does not require a linked `maintenance_requests` row

**Date:** 2026-08-06
**Status:** Point 1 (the `completion_image_url` column) remains Accepted. Point 2 (no `maintenance_requests` row is created) is superseded by ADR-016 — building Module 6 showed that without it, `GET /maintenance-requests` had no way to ever be populated.

**Context:** `API.md` §7 documents `PATCH /complaints/{id}/status` as accepting "(+ photo)" when maintenance staff marks a complaint `in_progress`/`completed`, but `DATABASE.md` §2.7's `complaints` table has only one photo column (`image_url`), populated at submission time by the student (`PRD.md` FR-4.1). Overwriting that column with the maintenance staff's completion photo would destroy the original evidence of the problem — the exact thing a student needs to compare against before verifying the fix (`PRD.md` FR-4.5). Separately, `maintenance_requests` (§2.8) has its own `completion_photo_url` and an optional `complaint_id` FK, raising the question of whether completing a complaint must also create a `maintenance_requests` row.

**Decision:**
1. Add `complaints.completion_image_url` (nullable), distinct from `image_url`. `PATCH /complaints/{id}/status` writes to this column when transitioning to `completed` with a photo attached; `image_url` is never overwritten after submission.
2. The Module 5 (Hostel Complaint) workflow is self-contained within the `complaints` table and does not require creating a `maintenance_requests` row. `maintenance_requests` (Module 6 — Maintenance Tracking) is for standalone/asset-level maintenance work; its optional `complaint_id` FK exists for cross-referencing when a warden chooses to also track a complaint there, not as a mandatory side effect of the complaint lifecycle.

**Alternatives Considered:**
- Overwrite `image_url` with the completion photo — rejected; destroys the before/after comparison a student needs for FR-4.5.
- Require every assigned complaint to spawn a `maintenance_requests` row — rejected; makes Module 5 depend on Module 6 existing/being correct to function at all, and duplicates status tracking across two tables for no stated requirement.

**Consequences:** `complaints` gained one nullable column (migration `0001_initial_schema.py`, no effect on existing rows). Module 6 remains free to link a `maintenance_requests` row back to a complaint via `complaint_id` for reporting purposes without that link being load-bearing for Module 5's own state machine.

---

## ADR-015: Pull forward a minimal, read-only `GET /users` for Module 5's warden assignment flow

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `PRD.md` FR-4.3 ("Wardens can assign complaints to maintenance staff") requires the warden to pick *which* maintenance_staff user to assign — but `API.md` §3's `GET /users` was admin-only, and full User Management is Module 14 (Admin Panel), built much later. Without some way to list maintenance_staff users, Module 5's `PATCH /complaints/{id}/assign` endpoint (already built, already validates `assigned_to` is a `maintenance_staff` user) would have no usable UI in front of it — a warden would have to already know a technician's UUID.

**Decision:** Build `GET /users` now (`app/services/users/router.py`), but scoped narrowly: admins get the full filterable listing as originally specified; wardens get the same endpoint but the `role` filter is forced to `maintenance_staff` regardless of what they pass (a warden can never list students, faculty, or other wardens through this endpoint). `GET /users/{id}`, `PATCH /users/{id}`, `DELETE /users/{id}` are *not* built yet — those remain Module 14's scope, since nothing in Module 5 needs them.

**Alternatives Considered:**
- Defer the Complaint Queue's assign UI entirely to Module 14, once User Management exists — rejected; FR-4.3 is explicitly Module 5's requirement, and the backend assign endpoint already works end-to-end except for this one missing lookup. Deferring it would ship Module 5 with a documented feature un-implementable from the UI.
- A dedicated `GET /complaints/assignable-staff` endpoint instead of reusing `/users` — rejected; it's the same query (`users WHERE role = 'maintenance_staff'`) under a different name, and `/users` already existed in the contract for admin.

**Consequences:** `API.md` §3's role column now reads "admin (any filter), warden (forced `role=maintenance_staff`)" instead of "admin" only. Module 14 extends this same router with `GET /users/{id}`, `PATCH`, `DELETE` — it does not need to revisit the `GET /users` role scoping done here.

---

## ADR-016: Assigning a complaint creates a linked `maintenance_requests` row; `maintenance_requests` gains a `status` column

**Date:** 2026-08-06
**Status:** Accepted (supersedes ADR-014 point 2)

**Context:** Building Module 6 (Maintenance Tracking) surfaced two problems: (1) `API.md` §11's `PATCH /maintenance-requests/{id}` is documented as "Update status, completion photo, feedback," but `DATABASE.md` §2.8's `maintenance_requests` table had no `status` column to update. (2) `API.md` §11 only defines `GET`/`PATCH` for `maintenance-requests` — there is no `POST` endpoint — and ADR-014 had decided complaints never create a linked `maintenance_requests` row. Combined, nothing in the system would ever create a `maintenance_requests` row, making Module 6's endpoints permanently unreachable/empty (`RULES.md` §8 — no half-finished implementations).

**Decision:**
1. Add `maintenance_requests.status` (`ENUM('pending', 'in_progress', 'completed')`, default `pending`) — a simpler state set than the complaint workflow's, appropriate for a technician-facing task list rather than a public-facing multi-party workflow.
2. `PATCH /complaints/{id}/assign` (Module 5) now also creates a `maintenance_requests` row (`complaint_id` = the complaint, `technician_id` = the assignee) in the same transaction. This reverses ADR-014 point 2: the complaint workflow's own `status` field remains the source of truth for the complaint itself, but maintenance staff now get a real, populated "My Tasks" list (`GET /maintenance-requests`) the moment a warden assigns them work — which is the only path that creates these rows today, since there's still no standalone `POST /maintenance-requests`.

**Alternatives Considered:**
- Add a `POST /maintenance-requests` endpoint for standalone asset issues instead of linking to complaint assignment — rejected for now; `API.md` §11 never defined one, and nothing in the current 14 modules calls for admin/warden to file a maintenance request that isn't rooted in either a complaint (Module 5) or an equipment record (Module 7, not yet built). Revisit once Module 7 needs to trigger repairs from an equipment status change.
- Derive an implicit two-state status from `actual_completion IS NULL` instead of adding a column — rejected; `API.md` explicitly documents a distinct "status" concept, and an explicit column is clearer than inferring state from a side-effect field.

**Consequences:** `maintenance_requests` gained one column (migration `0001_initial_schema.py`). `app/services/complaint/router.py::assign_complaint` now also writes to `maintenance_requests`, so its audit-log entry set grew to include `maintenance_request.created`. A maintenance-tracking task list is genuinely populated end-to-end without waiting on Module 7.

---

## ADR-017: New `equipment_requests` table backs FR-7.3 (faculty requesting equipment)

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `PRD.md` FR-7.3 says "Faculty can request equipment for classes/events," but `API.md` §4's only equipment endpoints are `GET /equipment` (any authenticated) and `POST`/`PATCH /equipment` (admin-only) — there is no path for a faculty member to request anything, and `DATABASE.md` has no table to record such a request.

**Decision:** Add a small `equipment_requests` table (`id`, `equipment_id`, `requester_id`, `purpose` nullable, `status ENUM('pending','approved','rejected')` default `pending`, `created_at`) and three endpoints under `/equipment`: `POST /equipment/{id}/request` (faculty; 400 if the equipment isn't `available`), `GET /equipment/requests` (admin), `PATCH /equipment/requests/{id}/approve` (admin; also flips the equipment's own `status` to `in_use`), `PATCH /equipment/requests/{id}/reject` (admin). This mirrors the pending/approve/reject shape already established for bookings (Module 3) rather than inventing a new pattern.

**Alternatives Considered:**
- Let faculty directly `PATCH /equipment/{id}` to set `status = 'in_use'` — rejected; `API.md` explicitly scopes equipment mutation to admin, and letting any faculty member flip any equipment's status with no approval step bypasses admin oversight of a shared physical asset.
- Model the request as a `notifications` row instead of a real table — rejected; there's no record for admin to list/filter/action against, and no way to track approve/reject history.

**Consequences:** `DATABASE.md` gains a new §2.17 `equipment_requests`, appended after `audit_logs` rather than inserted earlier, so existing §2.15/§2.16 cross-references elsewhere (`SECURITY.md`, `DEPLOYMENT.md`) don't need updating. `API.md` §4 gains the three new rows. Approving a request is the only thing that changes `equipment.status` outside of direct admin edits.

---

## ADR-018: QR attendance token defaults — 5-minute expiry, capped at 30 minutes, `secrets.token_urlsafe`

**Date:** 2026-08-06
**Status:** Accepted

**Context:** `PRD.md` FR-6.3 makes token expiry "(Optional) ... a configurable time window" but never states a default or a maximum — and `master-prompt.md`'s Non-Negotiable Invariant #5 requires tokens to be "short-lived." Leaving the window fully open would let a faculty member set an effectively unbounded expiry, undermining the invariant.

**Decision:** `POST /attendance/sessions` accepts an optional `duration_minutes` (default `5`, max `30` — request rejected above that). Tokens are generated with `secrets.token_urlsafe(32)` (256 bits of entropy from Python's CSPRNG), not derived from any guessable/sequential value.

**Alternatives Considered:**
- No configurability, fixed 5-minute window always — rejected; a faculty member running a longer lab session may reasonably need more than 5 minutes to let students scan.
- No maximum cap — rejected; directly undermines "short-lived" from the non-negotiable invariant list, which takes precedence over convenience.

**Consequences:** `app/services/attendance/router.py` validates `duration_minutes` via a Pydantic `Field(default=5, ge=1, le=30)`. Documented here so a future change to these numbers is a deliberate decision, not drift.

---

## ADR-019: `maintenance_requests.created_at` added for FR-12.1's performance metric; `/analytics/attendance` reuses `/attendance/reports`

**Date:** 2026-08-06
**Status:** Accepted

**Context:** Building Module 12 (Reports & Analytics) surfaced two gaps: (1) `PRD.md` FR-12.1 asks for "maintenance performance" reporting, which naturally means time-to-resolution — but `maintenance_requests` (`DATABASE.md` §2.8) had no creation timestamp to measure that against (only `estimated_completion`/`actual_completion`). (2) `API.md` documents `GET /attendance/reports` (§9) and `GET /analytics/attendance` (§13) as two separate endpoints with near-identical descriptions ("aggregated attendance reporting" / "attendance reports"), both scoped the same way (faculty own, admin all per FR-12.4) — building them as two independent implementations would mean the same aggregation logic drifts apart over time.

**Decision:**
1. Add `maintenance_requests.created_at` (`TIMESTAMPTZ`, server-default `now()`). Maintenance performance = average `actual_completion - created_at` over completed requests in the filtered window.
2. `GET /analytics/attendance` is a thin re-export of the same query `GET /attendance/reports` already uses (factored into `app/services/attendance/service.py::get_session_reports`), not a second implementation. Both routes stay in the contract per `API.md`, since Module 9 and Module 12 are documented as separate consumer contexts, but there is exactly one query behind them.

**Alternatives Considered:**
- Derive maintenance duration from `audit_logs` (diff between `maintenance_request.created` and `maintenance_request.updated` audit entries) instead of a new column — rejected; `audit_logs` is a forensic trail, not meant to be a primary data source for reporting queries, and would make a simple average query depend on join-heavy log parsing.
- Two independent attendance-report implementations (one per router) — rejected; guarantees the two will disagree eventually as one gets a bugfix or filter the other doesn't.

**Consequences:** `maintenance_requests` gains one more column beyond ADR-016's `status` (migration `0001_initial_schema.py`). `app/services/attendance/router.py`'s `/reports` endpoint and `app/services/analytics/router.py`'s `/analytics/attendance` endpoint both call the same shared function — a change to attendance-report filtering only needs to happen once.

---

## ADR-020 (Template for Future Entries)

**Date:**
**Status:** Proposed | Accepted | Superseded by ADR-XXX

**Context:**

**Decision:**

**Alternatives Considered:**

**Consequences:**

---

## How to Add a New Decision

1. Copy the template above.
2. Number it sequentially.
3. Keep entries factual and concise — this is a log, not a debate transcript.
4. If a later decision reverses an earlier one, mark the earlier entry's status as "Superseded by ADR-XXX" rather than deleting it — the history is the point.
