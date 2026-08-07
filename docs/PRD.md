# Product Requirements Document (PRD)
## Smart Campus Infrastructure Platform

**Version:** 1.0
**Status:** Draft
**Domain:** Education Technology (EdTech) / Smart Campus Management
**Project Type:** Full Stack Web Application
**Target Duration:** 4–6 Months (Final Year Capstone)

---

## 1. Purpose

This document defines the functional and non-functional requirements for the Smart Campus Infrastructure Platform — a centralized, role-based web application that digitizes the day-to-day operational management of a university campus (bookings, complaints, equipment, attendance, events, and reporting).

It exists to remove the emails/spreadsheets/paper-form workflows that currently cause double-bookings, delayed maintenance, poor visibility into resource usage, and inefficient communication.

---

## 2. Background & Problem Statement

University ERP systems typically cover admissions, fees, exams, faculty records, and payroll — but day-to-day **operational** activities remain manual. This causes:

| Problem | Impact |
|---|---|
| Double-booked classrooms/labs | Lost class time, faculty frustration |
| Manual hostel complaint handling | Slow resolution, no accountability |
| No equipment tracking | Lost/misplaced assets, warranty lapses |
| Event scheduling conflicts | Venue clashes, poor planning |
| No centralized lost & found | Items never recovered |
| Paper-based attendance | Time-consuming, error-prone, fraud-prone |
| Delayed maintenance requests | Deteriorating infrastructure |
| Limited reporting/analytics | No data-driven decisions |

---

## 3. Goals & Objectives

1. Digitize campus infrastructure management end-to-end
2. Reduce manual administrative workload
3. Improve utilization of rooms, labs, and equipment
4. Provide real-time status updates to all stakeholders
5. Increase transparency in complaint/maintenance handling
6. Improve maintenance response time
7. Eliminate double-booking/scheduling conflicts via backend validation
8. Enable data-driven decision-making through dashboards & analytics

### Non-Goals (Out of Scope for v1)
- Native mobile application (React Native is a future enhancement)
- Full IoT/occupancy sensing integration
- Institutional SSO (future enhancement)
- Predictive/AI-driven maintenance forecasting

---

## 4. User Roles & Personas

| Role | Core Responsibilities in System |
|---|---|
| **Student** | Reserve labs, submit hostel complaints, scan QR for attendance, report/search lost items, view bookings, receive notifications |
| **Faculty** | Book classrooms, reserve labs, schedule academic events, generate QR attendance, request equipment, view booking history |
| **Hostel Warden** | Review complaints, assign maintenance staff, monitor progress, view hostel reports |
| **Maintenance Staff** | View assigned tasks, update repair status, upload completion photos, mark jobs complete |
| **Administrator** | Manage users/buildings/classrooms/labs/equipment, approve bookings, monitor reports, configure notifications, view audit logs |

---

## 5. Functional Requirements

### 5.1 Module 1 — User Authentication & Role Management
- FR-1.1: Users register with email/password (Supabase Auth)
- FR-1.2: Users log in and receive a session (JWT-based)
- FR-1.3: Users can reset forgotten passwords via email link
- FR-1.4: System enforces role-based access control (RBAC) on every route/endpoint
- FR-1.5: Sessions expire after a configurable period of inactivity

### 5.2 Module 2 — Classroom Booking
- FR-2.1: Faculty can search classrooms by building, capacity, time slot, and equipment
- FR-2.2: Faculty can create a booking for an available room
- FR-2.3: Faculty can cancel their own bookings
- FR-2.4: Faculty can view their booking history
- FR-2.5: Backend must validate room availability, capacity, and conflicts with existing reservations or maintenance schedules before confirming a booking
- FR-2.6: Admin can approve/reject bookings where approval is required

### 5.3 Module 3 — Laboratory Reservation
- FR-3.1: Students/faculty can view lab availability
- FR-3.2: Students/faculty can reserve a lab session
- FR-3.3: Users can join a waiting list when a lab session is full
- FR-3.4: Waiting-list users receive an approval notification when a slot opens

### 5.4 Module 4 — Hostel Complaint Management
- FR-4.1: Students submit complaints with category, description, image, and priority
- FR-4.2: Complaint status follows the workflow: `Submitted → Assigned → In Progress → Completed → Verified`
- FR-4.3: Wardens can assign complaints to maintenance staff
- FR-4.4: Students can track complaint status in real time
- FR-4.5: Students confirm/verify completion before a complaint is closed

### 5.5 Module 5 — Event Scheduling
- FR-5.1: Departments can schedule events and book auditoriums/seminar halls
- FR-5.2: System prevents venue double-booking
- FR-5.3: Calendar view supports monthly, weekly, and daily display modes

### 5.6 Module 6 — QR Attendance
- FR-6.1: Faculty generates a dynamic QR code per session
- FR-6.2: Students scan the QR code to mark attendance instantly
- FR-6.3: (Optional) QR codes expire after a configurable time window
- FR-6.4: (Optional) Device/Wi-Fi validation to reduce proxy attendance

### 5.7 Module 7 — Equipment Inventory
- FR-7.1: Admin manages equipment records (projectors, computers, lab equipment, smart boards, furniture)
- FR-7.2: Each record tracks warranty, purchase date, location, status, and assigned department
- FR-7.3: Faculty can request equipment for classes/events

### 5.8 Module 8 — Lost & Found
- FR-8.1: Students can report a lost item with photo and description
- FR-8.2: Students can search found items
- FR-8.3: (Optional) AI-assisted item matching between lost and found reports

### 5.9 Module 9 — Maintenance Tracking
- FR-9.1: System tracks plumbing, electrical, network, and furniture repair requests
- FR-9.2: Each request records assigned technician, estimated completion, actual completion, and feedback
- FR-9.3: Maintenance staff can update status and upload completion photos

### 5.10 Module 10 — Dashboard
*Role-specific landing/overview experience — distinct from Reports & Analytics (Module 12), which covers deeper aggregated reporting.*
- FR-10.1: On login, each user role lands on a dashboard scoped to that role, per the information architecture in `UI_UX.md` §4 — never a generic one-size-fits-all view with other roles' features hidden
- FR-10.2: Dashboard surfaces the items requiring the user's attention (student's open complaints; faculty's upcoming bookings; warden's unassigned complaint queue; maintenance staff's assigned tasks; admin's pending approvals)
- FR-10.3: Dashboard provides 1–2 click access to the role's primary actions (book room, submit complaint, scan attendance, assign complaint, etc.), per `UI_UX.md` §2
- FR-10.4: Dashboard content reflects real-time status changes (bookings, complaints, notifications) without a manual refresh, via Supabase Realtime

### 5.11 Module 11 — Notification Center
- FR-11.1: Users receive in-app notifications for events relevant to them: booking confirmed/cancelled, complaint status changed, event reminder, maintenance task assigned, waitlist slot opened
- FR-11.2: Notifications are delivered in real time via Supabase Realtime and persisted so they remain visible after the triggering event
- FR-11.3: Users can view their notification list, filter by read/unread, and mark notifications as read
- FR-11.4: An unread-notification count is visible from any page in the app (e.g., a bell icon badge)
- FR-11.5: Email notifications are optional/supplementary for v1 (per §8 Assumptions & Constraints) — in-app + Realtime delivery is the mandatory channel
- FR-11.6: Admin can configure, per event type, whether the optional email channel is enabled system-wide

### 5.12 Module 12 — Reports & Analytics
- FR-12.1: Admin dashboard shows room/lab utilization, complaint statistics, attendance reports, equipment usage, event reports, and maintenance performance
- FR-12.2: Reports are filterable by date range, department, and building
- FR-12.3: Data is exportable (CSV/PDF) — *stretch goal*
- FR-12.4: Report visibility is role-scoped: wardens see hostel/complaint-related reports, faculty see their own attendance reports, admin sees all reports (per §4 role responsibilities)

### 5.13 Module 13 — Audit Logs
- FR-13.1: Every state-changing action on bookings, complaints, inventory, and admin/user management is recorded with actor, action, entity, before/after state, and timestamp
- FR-13.2: Admin can search and filter audit logs by actor, entity type, action, and date range
- FR-13.3: Audit log entries are immutable once written — no update or delete path exists for any application role
- FR-13.4: Audit logs serve as the system of record for investigating disputed actions (e.g., "who cancelled this booking")

### 5.14 Module 14 — Admin Panel
- FR-14.1: Admin manages user accounts — role assignment, department, activate/deactivate (soft delete)
- FR-14.2: Admin manages master data for buildings, rooms/labs/venues, and equipment
- FR-14.3: Admin approves or rejects bookings that require approval (shared with FR-2.6)
- FR-14.4: Admin configures notification settings — which event types trigger the optional email channel (FR-11.6)
- FR-14.5: Admin has access to Reports & Analytics (Module 12) and Audit Logs (Module 13) as part of the admin experience

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | API responses < 500ms for standard CRUD operations under normal load |
| **Scalability** | Backend services should be stateless and horizontally scalable |
| **Availability** | Target 99% uptime during academic term |
| **Security** | JWT-based auth, RBAC enforced server-side, input validation via Pydantic, HTTPS only |
| **Data Privacy** | Personal data (student/faculty info) accessible only per role permissions; audit-logged |
| **Usability** | Responsive UI (desktop + tablet); accessible forms and clear error states |
| **Reliability** | Booking conflict checks must be atomic (no race conditions on double-booking) |
| **Auditability** | All booking changes, complaint updates, admin actions, and inventory changes are logged |
| **Maintainability** | Modular backend services (booking, complaint, attendance, inventory, notification, audit) |
| **Real-time** | Status changes (bookings, complaints, notifications) reflected live via Supabase Realtime |

---

## 7. Success Metrics (KPIs)

- % reduction in room/lab double-booking incidents (target: 0 after backend validation goes live)
- Average complaint resolution time (before vs. after platform adoption)
- % of attendance recorded via QR vs. manual fallback
- Equipment tracked with complete metadata (target: 100% of inventoried assets)
- Admin dashboard adoption rate among staff
- User satisfaction score (post-launch survey)

---

## 8. Assumptions & Constraints

- Institution provides building/room/lab master data for initial seeding
- Supabase (PostgreSQL, Auth, Storage, Realtime) is the approved backend platform
- Email notifications are optional for v1; in-app + Realtime notifications are mandatory
- Team size and 4–6 month timeline may require phased delivery (see release plan)

---

## 9. Release Plan (Suggested Phasing)

| Phase | Modules |
|---|---|
| **Phase 1 (Foundation)** | Auth & Role Management, Dashboard, Admin Panel (users/buildings/rooms master data), Classroom Booking, Lab Reservation |
| **Phase 2 (Operations)** | Hostel Complaints, Maintenance Tracking, Notification Center |
| **Phase 3 (Campus Life)** | Event Scheduling, QR Attendance, Lost & Found |
| **Phase 4 (Insights)** | Equipment Inventory, Reports & Analytics, Audit Logs |

All 14 modules from `master-prompt.md`'s Project Identity are covered above; Admin Panel ships early because Classroom Booking and Lab Reservation depend on admin-managed building/room master data existing first.

---

## 10. Future Enhancements (Post-v1)

- Mobile application (React Native)
- AI-powered room/equipment recommendations
- Predictive maintenance from historical data
- IoT integration for smart classrooms and occupancy sensing
- Campus map with indoor navigation
- Institutional SSO
- Advanced analytics and forecasting
