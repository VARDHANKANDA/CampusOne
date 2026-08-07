# database.md
## Database Development Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use for schema design, migrations, or query work.

---

## Context

Database: **PostgreSQL via Supabase**, accessed through **SQLAlchemy 2** models and **Alembic** migrations.

Reference: `docs/DATABASE.md` (full schema reference), `docs/SECURITY.md` §2 (RLS as defense-in-depth), `RULES.md` §5.

---

## Instructions for the AI Assistant

When generating or modifying database schema/queries:

1. **Check `docs/DATABASE.md` first.** Before creating a new table, confirm it doesn't already exist or overlap with an existing one (e.g., don't create a separate `venues` table — venues are `rooms` with `type = 'auditorium'/'seminar_hall'`, per ADR-003 in `docs/DECISIONS.md`).

2. **Primary keys:** UUID, consistent with every existing table.

3. **Timestamps:** Every new table gets `created_at` and `updated_at` (`TIMESTAMPTZ`).

4. **Foreign keys:** Always specify `ON DELETE` behavior explicitly — default to `RESTRICT` unless there's a clear cascade case (e.g., deleting an `attendance_session` cascading to its `attendance_records`).

5. **Controlled vocabularies:** Use Postgres `ENUM` types or `CHECK` constraints for status/role/category fields — never free-text strings where a fixed set of values applies.

6. **Booking/event overlap constraints:** Any new bookable-resource table must include the same exclusion-constraint pattern as `bookings` (`docs/DATABASE.md` §2.4) if it represents a schedulable resource — this is a non-negotiable invariant (see `master-prompt.md`).

7. **RLS:** Enable Row-Level Security on new tables and write policies mirroring the role rules already enforced at the API layer (defense-in-depth, not the primary gate).

8. **Migrations:**
   - Generate via `alembic revision --autogenerate`, then manually review — constraints like exclusions or check constraints often need to be added by hand.
   - Never edit a migration already applied to a shared environment; create a new one instead.
   - For breaking changes, use an expand/contract pattern compatible with rolling deploys (`docs/DEPLOYMENT.md` §5).

9. **Indexing:** Add indexes for any new frequent filter/lookup pattern (status fields used in dashboard filters, foreign keys used in joins) — see `docs/DATABASE.md` §3 for existing index rationale to extend consistently.

10. **Audit table integrity:** Never grant `UPDATE`/`DELETE` on `audit_logs` to application roles — it must remain append-only.

---

## Checklist Before Returning Database Changes

- [ ] Confirmed no existing table/column already covers this need
- [ ] UUID PK, timestamps, explicit FK delete behavior
- [ ] Enum/check constraint used for controlled-vocabulary fields
- [ ] Exclusion constraint added if this is a new schedulable resource
- [ ] RLS policy added/updated to mirror API-layer role rules
- [ ] Migration generated, manually reviewed, and includes a downgrade path where feasible
- [ ] New indexes added for expected query patterns
