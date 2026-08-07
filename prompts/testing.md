# testing.md
## Testing Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use when writing or reviewing tests.

---

## Context

Reference: `docs/TESTING.md` (full strategy), `RULES.md` §7, `docs/DATABASE.md` §2.4 (overlap constraint), `docs/SECURITY.md`.

---

## Instructions for the AI Assistant

1. **Prioritize critical-path coverage first**, in this order of importance:
   1. Booking/event overlap detection (boundary cases: touching-but-not-overlapping windows, full overlap, partial overlap, cancellation freeing a slot)
   2. RBAC enforcement (every role × every endpoint it should/shouldn't access)
   3. Complaint state machine (valid transitions allowed, invalid transitions rejected)
   4. QR attendance token expiry and duplicate-scan prevention
   5. Everything else

2. **Every new backend endpoint needs at minimum:**
   - One happy-path test (`2xx`)
   - One authorization-failure test (`403` for a role that shouldn't have access)
   - One validation/business-rule failure test (`400`/`409`/`422` as appropriate)

3. **Concurrency tests for booking creation:** when implementing or testing the Booking Service, include a test that fires two near-simultaneous overlapping requests and asserts exactly one succeeds — this is the platform's core invariant, not an edge case to skip.

4. **Database-level constraint tests:** don't only test through the API — also test that the exclusion constraint itself rejects an overlapping insert if attempted directly, confirming the DB-layer defense actually works independent of application code.

5. **Frontend tests** should prioritize role-gated rendering and form validation correctness over exhaustive visual snapshot testing (`RULES.md` §7). Type-checking (`tsc --noEmit`) is a required CI gate, not a substitute for these tests (`docs/TESTING.md` §4).

6. **E2E tests** should cover the three priority flows named in `docs/TESTING.md` §2.5 (booking conflict flow, full complaint lifecycle, QR attendance flow) before expanding to secondary flows.

7. **Test data:** use seeded fixtures representing all five roles and a range of booking/complaint states — never write a test that only exercises the "everything succeeds" happy state for a role/permission matrix.

8. **Never test against production data or a production Supabase project.**

---

## Checklist Before Returning Test Code

- [ ] Happy path + at least one failure case covered for new endpoints
- [ ] RBAC matrix covered for the roles relevant to this feature
- [ ] Boundary/edge cases covered for any conflict-detection logic
- [ ] Concurrency test included if the feature touches booking/event creation
- [ ] Uses seeded test data, not production data
- [ ] Aligned with the risk areas table in `docs/TESTING.md` §6
