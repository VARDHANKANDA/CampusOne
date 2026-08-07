# auth.md
## Authentication & Authorization Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use for any work touching login, sessions, roles, or permissions.

---

## Context

Authentication is fully delegated to **Supabase Auth**, issuing JWTs consumed by the FastAPI backend. Authorization is a custom RBAC layer enforced per-endpoint, with Supabase RLS as a secondary safeguard.

Reference: `docs/SECURITY.md` §1–2, `docs/API.md` §2 (auth endpoints), `RULES.md` §6, `docs/DECISIONS.md` ADR-004.

---

## Instructions for the AI Assistant

1. **Never implement custom password hashing, storage, or reset-token logic.** All of that is Supabase Auth's responsibility. If a request implies building custom credential handling, redirect to the Supabase Auth flow instead.

2. **JWT validation is server-side, on every protected request**, via a shared FastAPI dependency (e.g., `get_current_user`). This dependency should:
   - Decode/validate the token
   - Resolve the user's role and identity
   - Reject with `401` on invalid/expired tokens

3. **Role checks are explicit per endpoint.** When implementing a new endpoint, state which of the five roles (`student`, `faculty`, `warden`, `maintenance_staff`, `admin`) may access it, consistent with `docs/API.md`'s role column. Reject unauthorized roles with `403`, not a silent empty response.

4. **Ownership checks stack on top of role checks.** A role check alone (e.g., "is this user a student") is not sufficient where the action is scoped to a specific record (e.g., a student cancelling *their own* booking, not any booking). Always verify the resource belongs to (or is otherwise appropriately scoped to) the requesting user, unless the role has explicit blanket access (e.g., admin).

5. **RLS policies must mirror API-layer rules**, not replace them. When adding/changing an RBAC rule at the API layer, flag that the corresponding Supabase RLS policy should be reviewed for consistency (`RULES.md` §5, `docs/SECURITY.md` §2).

6. **Frontend role-based UI is never a substitute for backend enforcement.** If a task only adds frontend hiding of a button without a corresponding backend check, treat the backend check as still required and call this out.

7. **Session/token handling:**
   - Frontend attaches `Authorization: Bearer <token>` via a centralized Axios interceptor — don't scatter token-attachment logic across individual API calls.
   - Token refresh/expiry handling should redirect to login gracefully, not surface a raw 401 to the user.

8. **Rate limiting:** Login, password reset, and QR-session-generation endpoints should be rate-limited per `docs/SECURITY.md` §7 — flag this as a requirement when implementing these endpoints if not already in place.

---

## Checklist Before Returning Auth-Related Code

- [ ] No custom password/credential storage introduced
- [ ] JWT validated server-side via the shared dependency
- [ ] Role check explicit and matches `docs/API.md`'s role column
- [ ] Ownership check added where the action is scoped to a specific user's own resource
- [ ] Corresponding RLS policy flagged for review if API-layer rules changed
- [ ] No security-relevant logic implemented only on the frontend
