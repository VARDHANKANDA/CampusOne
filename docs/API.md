# API.md — REST API Specification
## Smart Campus Infrastructure Platform

**Base URL (dev):** `http://localhost:8000/api/v1`
**Auth:** `Authorization: Bearer <supabase_jwt>` on all endpoints except `/auth/*` public routes
**Format:** JSON request/response bodies, validated via Pydantic

Related: `ARCHITECTURE.md` §3 (service breakdown), `SECURITY.md`, `RULES.md` §3.3 (conflict validation order)

---

## 1. Conventions

- Versioned prefix: `/api/v1/...`
- Resource-based, plural nouns: `/bookings`, `/complaints`
- Standard HTTP verbs: `GET` (read), `POST` (create), `PATCH` (partial update), `DELETE` (remove/cancel)
- Standard status codes:
  - `200` OK / `201` Created
  - `400` Bad Request (validation error)
  - `401` Unauthorized (missing/invalid token)
  - `403` Forbidden (valid token, insufficient role)
  - `404` Not Found
  - `409` Conflict (booking/scheduling conflict — payload includes conflicting resource)
  - `422` Unprocessable Entity (Pydantic validation failure)
- Pagination on list endpoints: `?page=1&page_size=20`, response includes `total`, `page`, `page_size`, `items`
- Filtering via query params: `?status=confirmed&room_id=...&from=...&to=...`
- Errors return a consistent shape:
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Requested time overlaps an existing booking.",
    "details": { "conflicting_booking_id": "...", "conflicting_window": ["...", "..."] }
  }
}
```

---

## 2. Auth Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create account (delegates to Supabase Auth) |
| POST | `/auth/login` | public | Login, returns session/JWT |
| POST | `/auth/logout` | authenticated | Invalidate session |
| POST | `/auth/password-reset` | public | Trigger reset email |
| GET | `/auth/me` | authenticated | Return current user profile + role |

---

## 3. User Management (Admin)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | admin (any filter), warden (forced `role=maintenance_staff`) | List users, filterable by role/department. Excludes deactivated users unless `include_inactive=true` (admin only) — needed to find and reactivate a user via `PATCH /users/{id}`. Warden access exists solely so the Complaint Queue can pick an assignee (`DECISIONS.md` ADR-015) |
| GET | `/users/{id}` | admin, self | Get user detail |
| PATCH | `/users/{id}` | admin | Update role/department/active status |
| DELETE | `/users/{id}` | admin | Deactivate user (soft delete) |

---

## 4. Buildings, Rooms & Equipment (Admin-managed)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/buildings` | any authenticated | List buildings |
| POST | `/buildings` | admin | Create building |
| GET | `/rooms` | any authenticated | List rooms, filter by building/type/capacity |
| POST | `/rooms` | admin | Create room |
| PATCH | `/rooms/{id}` | admin | Update room (capacity, active status) |
| GET | `/equipment` | any authenticated | List equipment, filter by category/status |
| POST | `/equipment` | admin | Create equipment record |
| PATCH | `/equipment/{id}` | admin | Update equipment (status, warranty, assignment) |
| POST | `/equipment/{id}/request` | faculty | Request equipment for a class/event (`PRD.md` FR-7.3, `DECISIONS.md` ADR-017); 400 if not currently `available` |
| GET | `/equipment/requests` | admin | List equipment requests |
| PATCH | `/equipment/requests/{id}/approve` | admin | Approve → equipment status becomes `in_use` |
| PATCH | `/equipment/requests/{id}/reject` | admin | Reject the request |

---

## 5. Booking Service

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/bookings/availability` | faculty, admin | Query room availability for a window |
| POST | `/bookings` | faculty | Create booking (validated per `RULES.md` §3.3) |
| GET | `/bookings` | owner (student or faculty), admin (all) | List bookings, filterable by room/date/status — students only ever own lab bookings (§6), since classroom booking creation is faculty-only |
| GET | `/bookings/{id}` | owner, admin | Booking detail |
| PATCH | `/bookings/{id}/cancel` | owner, admin | Cancel a booking |
| PATCH | `/bookings/{id}/approve` | admin | Approve a pending booking |
| PATCH | `/bookings/{id}/reject` | admin | Reject a pending booking |

**Conflict response example (`409`):**
```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Room already booked for the requested window.",
    "details": {
      "conflicting_booking_id": "b1a2...",
      "conflicting_window": ["2026-08-10T09:00:00Z", "2026-08-10T10:00:00Z"]
    }
  }
}
```

---

## 6. Laboratory Reservation & Waitlist

Lab reservations are `bookings` rows for a `type = 'lab'` room (`DECISIONS.md` ADR-003) — created through the endpoints below, but viewed/cancelled through the same `GET /bookings`, `GET /bookings/{id}`, `PATCH /bookings/{id}/cancel` endpoints as classroom bookings (§5), which are owner-scoped for any role. There is no separate `GET /labs/reservations` endpoint.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/labs/availability` | student, faculty | View lab session availability |
| POST | `/labs/reservations` | student, faculty | Reserve a lab session (same conflict validation as §5; 409 on overlap) |
| POST | `/labs/waitlist` | student, faculty | Join the waitlist for a room+window that is currently unavailable — `400` if the window is actually open (book it directly instead) |
| GET | `/labs/waitlist/{room_id}` | admin | View current waitlist, ordered by position |

**Waitlist notification (FR-3.4):** wiring an actual notification when a slot opens is implemented in Module 11 — Notification Center; the integration point is `PATCH /bookings/{id}/cancel` (`DECISIONS.md` ADR-014).

---

## 7. Complaint Service

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/complaints` | student | Submit complaint (multipart for image) |
| GET | `/complaints` | student (own), warden/admin (all) | List complaints, filter by status/category/priority |
| GET | `/complaints/{id}` | reporter, warden, admin, assignee | Complaint detail |
| PATCH | `/complaints/{id}/assign` | warden | Assign to maintenance staff → status `assigned` |
| PATCH | `/complaints/{id}/status` | maintenance_staff | Update progress → `in_progress` / `completed` (+ photo) |
| PATCH | `/complaints/{id}/verify` | reporter | Confirm resolution → status `verified` |

---

## 8. Event Scheduling

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/events` | any authenticated | List events, filter by date/venue (monthly/weekly/daily) |
| POST | `/events` | faculty, admin | Schedule event (same conflict validation as bookings) |
| PATCH | `/events/{id}/cancel` | organizer, admin | Cancel event |

---

## 9. QR Attendance

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/attendance/sessions` | faculty | Generate session + time-bound QR token |
| POST | `/attendance/scan` | student | Submit scanned token → attendance record |
| GET | `/attendance/sessions/{id}/records` | faculty, admin | View attendance for a session |
| GET | `/attendance/reports` | faculty, admin | Aggregated attendance reporting |

---

## 10. Lost & Found

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/lost-found` | student | Report lost/found item (with image) |
| GET | `/lost-found` | any authenticated | Search items, filter by type/status/keyword |
| PATCH | `/lost-found/{id}/status` | admin, reporter | Mark matched/closed |

---

## 11. Maintenance Tracking

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/maintenance-requests` | maintenance_staff (own), warden/admin (all) | List assigned tasks |
| PATCH | `/maintenance-requests/{id}` | maintenance_staff | Update status, completion photo, feedback |

---

## 12. Notifications

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/notifications` | authenticated (own) | List notifications, `?unread=true` filter |
| PATCH | `/notifications/{id}/read` | authenticated (own) | Mark as read |
| GET | `/admin/notification-settings` | admin | List per-event-type email toggle settings |
| PATCH | `/admin/notification-settings/{event_type}` | admin | Enable/disable the optional email channel for one event type (`PRD.md` FR-11.6/FR-14.4) |

*Real-time push happens via Supabase Realtime channel subscription — this REST endpoint covers historical/poll fallback.*

---

## 13. Dashboard & Analytics

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/analytics/room-utilization` | admin | Room usage stats, filterable by date/building |
| GET | `/analytics/complaints` | admin, warden | Complaint statistics |
| GET | `/analytics/attendance` | admin, faculty | Attendance reports |
| GET | `/analytics/equipment` | admin | Equipment usage/status breakdown |
| GET | `/analytics/maintenance` | admin | Maintenance performance metrics |

---

## 14. Audit Logs

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit-logs` | admin | List logs, filterable by actor/entity_type/date range |

---

## 15. Versioning & Deprecation Policy

- Breaking changes require a new version prefix (`/api/v2`) — existing `/api/v1` routes remain functional during a deprecation window.
- Non-breaking additions (new optional fields, new endpoints) can be added to the current version without a bump.
