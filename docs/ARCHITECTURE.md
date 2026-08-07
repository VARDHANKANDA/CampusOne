# ARCHITECTURE.md — System Blueprint
## Smart Campus Infrastructure Platform

**Version:** 1.0
**Related documents:** `PRD.md` (requirements), `RULES.md` (development guidelines)

---

## 1. Architectural Overview

The Smart Campus Infrastructure Platform is a three-tier web application:

1. **Presentation Tier** — React (Vite) single-page application
2. **Application Tier** — FastAPI backend exposing a REST API, organized into domain services
3. **Data & Platform Tier** — Supabase, providing PostgreSQL, Authentication, Storage, and Realtime pub/sub

```
                    React.js (Frontend)
                            │
                REST API (HTTPS + JWT)
                            │
                    FastAPI Backend
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
 Business Logic       Authentication      Notification Service
        │                   │                   │
        └───────────────┬───┴───────────────────┘
                        ▼
                  Supabase Services
        ┌───────────────┼────────────────────┐
        ▼               ▼                    ▼
   PostgreSQL      Supabase Auth     Supabase Storage
        │
        ▼
   Supabase Realtime
```

**Design intent:** Keep the frontend a thin presentation layer. All authorization, conflict detection, and business rules live in the FastAPI backend, so the system remains secure and consistent regardless of client. Supabase is treated as managed infrastructure (DB + Auth + Storage + Realtime), not as a place to put business logic.

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Purpose |
|---|---|
| React 19 (Vite) | UI framework / build tooling |
| TypeScript | Static typing across all frontend code — no plain `.js`/`.jsx` |
| Tailwind CSS | Styling |
| React Router | Client-side navigation |
| Axios | HTTP client for API calls |
| TanStack Query | Server-state fetching & caching |
| React Hook Form | Form state & validation |
| Chart.js / Recharts | Dashboard visualizations |

### 2.2 Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| Python 3.12 | Backend language |
| Uvicorn | ASGI server |
| SQLAlchemy 2 | ORM |
| Alembic | Database migrations |
| Pydantic v2 | Request/response validation |
| Supabase Python SDK | Integration with Supabase services |

> Version pins above are authoritative per `master-prompt.md`'s Technology Stack table (`master-prompt.md` §Technology Stack; decision logged as `DECISIONS.md` ADR-006).

### 2.3 Data & Platform
| Technology | Purpose |
|---|---|
| Supabase PostgreSQL | Primary relational database |
| Supabase Auth | Authentication & session/JWT issuance |
| Supabase Storage | File storage (images, photos, documents) |
| Supabase Realtime | Live update pub/sub (bookings, complaints, notifications) |

### 2.4 Tooling
Git & GitHub (version control), Postman (API testing), VS Code (IDE), Docker & Docker Compose (backend containerization for Railway deployment and local multi-service dev, per §9), DBeaver (DB management).

---

## 3. Backend Service Architecture

The backend is organized into domain-oriented services, each owning its own routes, schemas, and logic, sharing a common core (auth dependency, DB session, config).

### 3.1 Booking Service
- **Owns:** classroom booking, lab reservation, event/venue scheduling
- **Responsibilities:** availability checking, conflict detection, capacity validation, waiting-list management
- **Key invariant:** no two confirmed bookings may overlap for the same resource and time window

### 3.2 Complaint Service
- **Owns:** hostel complaint lifecycle
- **Responsibilities:** complaint intake, workflow state transitions, assignment to maintenance staff
- **State machine:** `Submitted → Assigned → In Progress → Completed → Verified`

### 3.3 Attendance Service
- **Owns:** QR-based attendance
- **Responsibilities:** dynamic QR generation (per session, time-bound), scan validation, attendance record creation, attendance reporting

### 3.4 Inventory Service
- **Owns:** equipment inventory
- **Responsibilities:** equipment CRUD, stock/status tracking, warranty monitoring, department assignment

### 3.5 Notification Service
- **Owns:** cross-cutting notifications (`PRD.md` Module 11 — Notification Center)
- **Responsibilities:** booking confirmations, complaint status updates, event reminders, maintenance alerts; exposes admin-configurable per-event-type email toggles (`PRD.md` FR-11.6/FR-14.4)
- **Delivery:** Supabase Realtime (primary, in-app) + email (optional, secondary, gated by admin configuration)

### 3.6 Audit Logging Service
- **Owns:** system-wide audit trail
- **Responsibilities:** records login activity, booking changes, complaint updates, admin actions, inventory changes
- **Design:** append-only; failures in logging must not roll back the primary transaction

---

## 4. Data Model (Conceptual)

Core entities and their primary relationships:

- **User** (role: student | faculty | warden | maintenance_staff | admin) — 1:N → Bookings, Complaints, AuditLogs
- **Building** — 1:N → Classroom, Lab, Venue
- **Classroom / Lab / Venue** — 1:N → Booking; 1:N → MaintenanceSchedule
- **Booking** — belongs to User (requester), belongs to Classroom/Lab/Venue, has status (pending | confirmed | cancelled | rejected)
- **Complaint** — belongs to User (reporter), optionally assigned to MaintenanceStaff, has status (per workflow above), has category/priority/images
- **MaintenanceRequest** — linked to Complaint or standalone asset issue, tracks technician, estimated/actual completion
- **Equipment** — belongs to Building/Department, tracks warranty/purchase/status
- **AttendanceSession** — belongs to Faculty + Course, has QR token + expiry
- **AttendanceRecord** — belongs to AttendanceSession + Student
- **LostFoundItem** — belongs to reporting User, type (lost | found), has image + description
- **Notification** — belongs to User, references source entity (booking/complaint/event)
- **AuditLog** — actor, action, entity type/id, before/after snapshot, timestamp

> Note: This is a conceptual model for planning purposes. Exact column-level schema should be formalized in Alembic migrations as each module is implemented.

---

## 5. Request Flow Examples

### 5.1 Classroom Booking Flow
1. Faculty searches available rooms (frontend → `GET /bookings/availability`)
2. Faculty submits a booking request (`POST /bookings`)
3. Backend Booking Service validates: resource exists → no maintenance block → no overlapping confirmed booking → role permitted
4. On success: booking created as `confirmed` (or `pending` if approval required) → Audit log entry written → Notification Service pushes confirmation via Supabase Realtime
5. On conflict: `409 Conflict` returned with the conflicting time window for UI display

### 5.2 Hostel Complaint Flow
1. Student submits complaint with image upload (`POST /complaints`) → image stored in Supabase Storage, URL saved on record
2. Complaint created with status `Submitted` → Audit log entry
3. Warden reviews and assigns to Maintenance Staff (`PATCH /complaints/{id}/assign`) → status → `Assigned`
4. Maintenance Staff updates progress (`PATCH /complaints/{id}/status`) → `In Progress` → `Completed` (with photo upload)
5. Student verifies resolution → status → `Verified`
6. Each transition triggers a Notification + Audit log entry

### 5.3 QR Attendance Flow
1. Faculty generates a session QR (`POST /attendance/sessions`) → time-bound token created
2. Students scan QR (`POST /attendance/scan`) → backend validates token validity/expiry (and optionally device/Wi-Fi) → attendance record created
3. Attendance Service aggregates records for reporting on the Dashboard

---

## 6. Authentication & Authorization

- **Authentication:** Supabase Auth issues JWTs on login; frontend attaches JWT as `Authorization: Bearer <token>` on all API calls.
- **Authorization:** FastAPI dependency (`get_current_user`) decodes/validates the JWT and resolves the user's role; each endpoint declares which roles may access it (e.g., via a role-check dependency/decorator).
- **Defense in depth:** Supabase Row-Level Security (RLS) policies mirror the same role rules at the database layer as a secondary safeguard — the API remains the primary authorization boundary.

---

## 7. Real-Time & Notification Architecture

- Supabase Realtime channels are scoped per relevant entity (e.g., a user's notification channel, a booking's status channel).
- Backend writes trigger Postgres changes, which Supabase Realtime broadcasts to subscribed frontend clients — the frontend does not poll.
- Email notifications (optional) are dispatched asynchronously from the Notification Service and must not block the primary API response.

---

## 8. Storage Architecture

- Supabase Storage buckets are separated by content type/purpose, e.g.:
  - `complaint-images/`
  - `maintenance-completion-photos/`
  - `lost-found-images/`
- Uploads are validated (type, size) at the API layer before a signed upload URL/reference is issued or before proxying to storage.
- Stored file references (not raw paths from client input) are what get persisted to the database.

---

## 9. Deployment View

| Component | Hosting |
|---|---|
| Frontend (React/Vite build) | Vercel |
| Backend (FastAPI) | Docker container on Railway |
| Database/Auth/Storage/Realtime | Supabase managed cloud |

Vercel and Railway are the decided targets, not options among several — see `DECISIONS.md` ADR-007. Full deployment procedure in `DEPLOYMENT.md`.

Environment configuration (Supabase URL/keys, JWT secret, allowed CORS origins) is injected via environment variables per environment (local/dev/staging/prod) — never committed to source control.

---

## 10. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Conflict prevention** | Server-side, transactional validation in Booking Service (locking on overlapping window checks) |
| **Auditability** | Every state-changing action logged via Audit Logging Service |
| **Consistency** | Backend is the single source of truth; frontend never performs authoritative validation |
| **Scalability** | Stateless FastAPI instances behind a load balancer; DB/Auth/Storage/Realtime scaling delegated to Supabase |
| **Observability** | API-level logging + audit logs; consider adding structured logging/metrics as the system matures |

---

## 11. Extension Points (Future Architecture)

These are anticipated seams for the future enhancements listed in the PRD:

- **Mobile app (React Native):** consumes the same FastAPI REST API — no backend changes required if API contracts stay stable
- **AI-assisted lost & found matching:** additional service/module calling an ML matching endpoint, feeding off existing LostFoundItem data
- **Predictive maintenance:** analytics layer consuming MaintenanceRequest history — likely a separate reporting/ML service reading from PostgreSQL
- **IoT/occupancy sensing:** would introduce a new ingestion service feeding real-time occupancy data into the Booking/Dashboard services
- **SSO:** would replace/extend Supabase Auth with an institutional identity provider (SAML/OIDC) at the authentication boundary only — downstream services unaffected
