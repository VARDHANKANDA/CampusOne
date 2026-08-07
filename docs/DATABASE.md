# DATABASE.md — Schema & Data Design
## Smart Campus Infrastructure Platform

**Engine:** PostgreSQL (via Supabase)
**Migration tool:** Alembic
**ORM:** SQLAlchemy

Related: `ARCHITECTURE.md` (conceptual model), `RULES.md` §5 (DB conventions)

---

## 1. Conventions

- Primary keys: `UUID`, generated via `gen_random_uuid()` (Postgres) or app-side `uuid4()`.
- Every table has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (updated via trigger or app logic).
- Foreign keys always declared with `ON DELETE` behavior explicitly chosen (`RESTRICT` by default; `CASCADE` only where deletion of the parent should clearly remove children, e.g., a session's attendance records).
- Enum-like fields (role, status) use Postgres `ENUM` types or `CHECK` constraints — never free-text strings for controlled vocabularies.
- Table names: `snake_case`, plural (`bookings`, `complaints`).
- All tables enable Row-Level Security (RLS); policies mirror API-layer role rules (defense in depth per `RULES.md` §5).

---

## 2. Core Tables

### 2.1 `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | matches Supabase Auth user id |
| email | TEXT UNIQUE | |
| full_name | TEXT | |
| role | ENUM('student','faculty','warden','maintenance_staff','admin') | |
| department | TEXT | nullable |
| is_active | BOOLEAN DEFAULT true | |
| created_at / updated_at | TIMESTAMPTZ | |

### 2.2 `buildings`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| code | TEXT UNIQUE | |
| location | TEXT | nullable |

### 2.3 `rooms` (classrooms, labs, venues — unified with `type`)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| building_id | UUID FK → buildings | |
| name | TEXT | e.g. "Lab 204" |
| type | ENUM('classroom','lab','auditorium','seminar_hall') | |
| capacity | INTEGER | |
| equipment_tags | TEXT[] | e.g. {'projector','smartboard'} |
| is_active | BOOLEAN DEFAULT true | decommissioned rooms excluded from booking |
| requires_approval | BOOLEAN DEFAULT false | admin-configurable; bookings for this room are created `pending` instead of auto-`confirmed` (`DECISIONS.md` ADR-012) |

### 2.4 `bookings`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| room_id | UUID FK → rooms | |
| requester_id | UUID FK → users | |
| start_time | TIMESTAMPTZ | |
| end_time | TIMESTAMPTZ | |
| status | ENUM('pending','confirmed','cancelled','rejected') | |
| purpose | TEXT | nullable |
| created_at / updated_at | TIMESTAMPTZ | |

**Constraint:** exclusion constraint (Postgres `EXCLUDE USING gist`) on `(room_id, tstzrange(start_time, end_time))` where `status = 'confirmed'` — enforces no overlapping confirmed bookings at the database level, in addition to application-layer checks.

### 2.5 `maintenance_schedules`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| room_id | UUID FK → rooms | |
| start_time / end_time | TIMESTAMPTZ | blocks bookings during this window |
| reason | TEXT | |

### 2.6 `waitlist_entries`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| room_id | UUID FK → rooms | |
| user_id | UUID FK → users | |
| requested_start / requested_end | TIMESTAMPTZ | |
| position | INTEGER | queue order |
| notified_at | TIMESTAMPTZ | nullable |

### 2.7 `complaints`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| reporter_id | UUID FK → users | |
| category | ENUM('plumbing','electrical','network','furniture','other') | |
| description | TEXT | |
| image_url | TEXT | Supabase Storage reference, nullable — the original report photo |
| completion_image_url | TEXT | Supabase Storage reference, nullable — maintenance staff's evidence-of-fix photo, distinct from `image_url` (`DECISIONS.md` ADR-014) |
| priority | ENUM('low','medium','high','urgent') | |
| status | ENUM('submitted','assigned','in_progress','completed','verified') | |
| assigned_to | UUID FK → users | nullable, maintenance_staff role |
| created_at / updated_at | TIMESTAMPTZ | |

### 2.8 `maintenance_requests`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| complaint_id | UUID FK → complaints | nullable; currently always set — rows are created only as a side effect of assigning a complaint (`DECISIONS.md` ADR-016). Nullable so a future standalone-creation path doesn't need a migration. |
| equipment_id | UUID FK → equipment | nullable |
| technician_id | UUID FK → users | |
| status | ENUM('pending','in_progress','completed') DEFAULT 'pending' | added per `DECISIONS.md` ADR-016 — `API.md` §11 promised a status update with no backing column |
| estimated_completion | TIMESTAMPTZ | nullable |
| actual_completion | TIMESTAMPTZ | nullable |
| completion_photo_url | TEXT | nullable |
| feedback | TEXT | nullable |
| created_at | TIMESTAMPTZ | added per `DECISIONS.md` ADR-019 — needed to compute time-to-resolution for FR-12.1's maintenance-performance metric, which was otherwise uncomputable |

### 2.9 `events`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| room_id | UUID FK → rooms | auditorium/seminar hall |
| organizer_id | UUID FK → users | |
| title | TEXT | |
| start_time / end_time | TIMESTAMPTZ | |
| status | ENUM('scheduled','cancelled') | |

*Shares the same overlap-prevention pattern as `bookings` (exclusion constraint on room + time range).*

### 2.10 `attendance_sessions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| faculty_id | UUID FK → users | |
| course_code | TEXT | |
| qr_token | TEXT UNIQUE | short-lived, random |
| expires_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### 2.11 `attendance_records`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| session_id | UUID FK → attendance_sessions | |
| student_id | UUID FK → users | |
| scanned_at | TIMESTAMPTZ | |
| UNIQUE(session_id, student_id) | | prevents duplicate scans |

### 2.12 `equipment`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| category | ENUM('projector','computer','lab_equipment','smart_board','furniture','other') | |
| building_id | UUID FK → buildings | nullable |
| department | TEXT | nullable |
| purchase_date | DATE | nullable |
| warranty_expiry | DATE | nullable |
| status | ENUM('available','in_use','under_repair','decommissioned') | |

### 2.13 `lost_found_items`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| reporter_id | UUID FK → users | |
| type | ENUM('lost','found') | |
| description | TEXT | |
| image_url | TEXT | nullable |
| status | ENUM('open','matched','closed') | |
| created_at | TIMESTAMPTZ | |

### 2.14 `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| type | TEXT | e.g. 'booking_confirmed' |
| payload | JSONB | entity references, message |
| read_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | |

### 2.15 `notification_settings`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_type | TEXT UNIQUE | e.g. 'booking_confirmed', 'complaint_status_changed' — matches `notifications.type` values |
| email_enabled | BOOLEAN DEFAULT false | system-wide toggle for the optional email channel (`PRD.md` FR-11.6) |
| updated_by | UUID FK → users | admin who last changed this setting |
| updated_at | TIMESTAMPTZ | |

Seeded with one row per known notification event type at migration time, `email_enabled = false` by default (in-app + Realtime is the only mandatory channel per `PRD.md` §8). Admin-managed via `PATCH /admin/notification-settings` (`API.md` §12); every update is audit-logged like any other admin action.

### 2.16 `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| actor_id | UUID FK → users | nullable (system actions) |
| action | TEXT | e.g. 'booking.created' |
| entity_type | TEXT | |
| entity_id | UUID | |
| before_state | JSONB | nullable |
| after_state | JSONB | nullable |
| created_at | TIMESTAMPTZ | |

**Table is append-only:** no `UPDATE`/`DELETE` grants for application roles beyond the service role.

### 2.17 `equipment_requests`
Backs `PRD.md` FR-7.3 (`DECISIONS.md` ADR-017).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| equipment_id | UUID FK → equipment | |
| requester_id | UUID FK → users | faculty |
| purpose | TEXT | nullable |
| status | ENUM('pending','approved','rejected') | |
| created_at | TIMESTAMPTZ | |

---

## 3. Indexing Strategy

- `bookings(room_id, start_time, end_time)` — GiST index for overlap queries
- `complaints(status)`, `complaints(assigned_to)` — for dashboard filtering
- `attendance_records(session_id)` — for per-session reporting
- `audit_logs(entity_type, entity_id)` — for entity history lookups
- `notifications(user_id, read_at)` — for unread-count queries

---

## 4. Migration Workflow

1. Modify SQLAlchemy models
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review the generated migration manually (autogenerate can miss constraints like exclusion constraints — add these by hand)
4. Apply: `alembic upgrade head`
5. Never edit a migration that has already been applied to a shared environment — create a new one

---

## 5. Seed Data Requirements

Initial seed data (provided by institution, per `PRD.md` §8 assumptions):
- Buildings and rooms (with type/capacity/equipment tags)
- Admin user account(s)
- Department list

---

## 6. Data Retention & Privacy Notes

- Personal data (student/faculty profile fields) is only exposed via API responses filtered by the requester's role — never returned wholesale.
- Audit logs retain actor/action history indefinitely unless an institutional data-retention policy specifies otherwise.
- Images (complaint photos, lost & found, completion photos) stored in Supabase Storage — DB stores only references, not binary data.
