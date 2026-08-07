# SECURITY.md — Security Model & Practices
## Smart Campus Infrastructure Platform

Related: `RULES.md` §6, `ARCHITECTURE.md` §6, `API.md` §1 (status codes)

---

## 1. Authentication

- All authentication is delegated to **Supabase Auth** — the application never implements custom password hashing/storage.
- Sessions are represented as **JWTs** issued by Supabase, sent as `Authorization: Bearer <token>` on every API request.
- Tokens are validated server-side on every request via a FastAPI dependency; expired/invalid tokens return `401`.
- Password reset flows go through Supabase's built-in email-based reset — no custom reset-token logic in the application layer.

---

## 2. Authorization (RBAC)

- Five roles: `student`, `faculty`, `warden`, `maintenance_staff`, `admin` (see `PRD.md` §4).
- **Every** API endpoint declares an explicit allowed-roles list; there is no "implicitly open" endpoint beyond public auth routes.
- Authorization is enforced **server-side only**. Frontend role-based UI hiding (see `UI_UX.md` §2) is a UX convenience, never a security boundary.
- Ownership checks apply in addition to role checks where relevant (e.g., a student can only view/cancel *their own* bookings, not another student's, even though both share the `student` role).
- Supabase **Row-Level Security (RLS)** policies mirror the same rules at the database layer as defense-in-depth (per `RULES.md` §5) — RLS is a backstop, not the primary gate.

---

## 3. Data Protection

- All traffic is HTTPS-only; no plaintext HTTP in any environment beyond local dev.
- Secrets (Supabase service key, JWT signing secret, DB credentials) live only in environment variables, never in source control (`RULES.md` §6).
- Personal data (names, contact info, department) is only returned in API responses appropriate to the requester's role — e.g., a student's contact info is not exposed to other students via the Lost & Found module.
- File uploads (complaint images, completion photos, lost & found photos) are:
  - Type-restricted (image formats only)
  - Size-limited
  - Stored via Supabase Storage; the database stores only the resulting reference, never a raw client-supplied path

---

## 4. Input Validation

- All request bodies validated via **Pydantic** models — no unvalidated raw dict access in endpoint handlers.
- Query parameters (filters, pagination) validated for type and bounds (e.g., `page_size` capped to prevent excessive-load queries).
- File upload content-type is verified server-side (not trusted from client-supplied MIME headers alone) before storage.

---

## 5. Booking / Scheduling Integrity

- Conflict checks run inside a database transaction with row-level locking (or a Postgres exclusion constraint per `DATABASE.md` §2.4) to prevent race conditions from concurrent booking requests.
- This is treated as a security-adjacent concern, not just correctness — unvalidated concurrent writes could be used to bypass capacity/availability rules.

---

## 6. QR Attendance Integrity

- QR tokens are short-lived and single-purpose, tied to a specific `attendance_session` (`DATABASE.md` §2.10) — 5-minute default expiry, capped at 30 minutes, generated via `secrets.token_urlsafe(32)` (`DECISIONS.md` ADR-018).
- A token cannot be reused after expiry; the scan endpoint validates expiry server-side, not client-side.
- `UNIQUE(session_id, student_id)` constraint on `attendance_records` prevents duplicate/replayed scans from the same student.
- Optional hardening (per `PRD.md` FR-6.3/6.4): device fingerprint or Wi-Fi network validation to reduce proxy attendance — treated as additional signal, not a sole gate.

---

## 7. Rate Limiting & Abuse Prevention

- Sensitive endpoints are rate-limited per IP/user:
  - Login attempts
  - Password reset requests
  - QR session generation
  - Complaint/lost-found submission (prevent spam)
- Repeated failed authentication attempts should trigger temporary lockout or backoff (delegated to Supabase Auth where supported).

---

## 8. Audit Logging

- All state-changing actions on bookings, complaints, inventory, and admin/user management are logged to the append-only `audit_logs` table (`DATABASE.md` §2.16, `RULES.md` §3.4).
- Audit log entries capture actor, action, entity, before/after state, and timestamp — sufficient to reconstruct "who did what, when" for any disputed change.
- Application roles have no `UPDATE`/`DELETE` grants on `audit_logs`.

---

## 9. Error Handling & Information Disclosure

- API error responses never leak stack traces, internal file paths, or raw database errors to clients — errors are mapped to the structured shape defined in `API.md` §1.
- Logging captures full error detail server-side for debugging; client-facing messages stay generic and safe.

---

## 10. Dependency & Environment Hygiene

- Backend and frontend dependencies are kept current; known-vulnerable versions are not knowingly shipped.
- Environment separation (local/dev/staging/prod) uses distinct Supabase projects/credentials — production secrets never used in lower environments.
- Docker images (if used) avoid embedding secrets at build time; secrets are injected at runtime.

---

## 11. Incident Response (Lightweight, Capstone Scope)

- Audit logs are the primary forensic tool for investigating disputed actions (e.g., "who cancelled this booking").
- Compromised credentials: admin can deactivate a user (`PATCH /users/{id}`) immediately, which should also be reflected in Supabase Auth to block further logins.
- Any discovered vulnerability during development should be documented in `DECISIONS.md` along with the remediation taken.
