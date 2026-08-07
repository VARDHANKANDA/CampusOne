# UI_UX.md — Design & Frontend Experience Guidelines
## Smart Campus Infrastructure Platform

Related: `ARCHITECTURE.md` §2.1 (frontend stack), `RULES.md` §4 (frontend rules), `prompts/ui.md` (AI design prompt — same system, condensed for prompting)

---

## 1. Design Concept

**The Campus Directory Board.** University buildings already have a visual language for status and wayfinding — brass room plaques, engraved directory boards, raised nameplates. This platform digitizes campus operations, so its interface borrows that physical vocabulary rather than defaulting to a generic SaaS admin look. Cards read like plaques; identifiers read like they're engraved into the corner; status reads like it's been stamped.

This concept drives every visual decision below — color, depth, and the signature "plaque card" component.

---

## 2. Design Principles

1. **Role clarity first.** Each role sees a distinct, purpose-built view — never a generic dashboard with hidden/disabled clutter from other roles.
2. **Status is always visible.** Bookings, complaints, and maintenance requests always show a clear status badge — users should never have to guess "where is this in the process."
3. **Low-friction core actions.** The most common actions (book a room, submit a complaint, scan attendance) should be reachable within 1–2 clicks from the dashboard.
4. **Real-time feels real-time.** Status changes (booking confirmed, complaint updated) should reflect in the UI without a manual refresh.
5. **Consistent, not novel.** Reuse the same plaque-card/table/form/modal patterns across modules so the app feels like one product, not ten prototypes stitched together.
6. **Depth means something.** Elevation and shadow communicate state (resting, hover, overlay, pressed) — not decoration for its own sake.

---

## 3. Visual Design System

### 3.1 Color Palette

| Token | Hex | Use |
|---|---|---|
| `--ink-navy` | `#1B2A4A` | Primary brand color — nav, headers, primary text on light backgrounds |
| `--brass` | `#B8863E` | Primary accent — CTAs, active states, plaque edges, focus rings |
| `--brass-light` | `#D9B876` | Gradient highlight on brass elements, hover glow |
| `--quad-green` | `#3F6B4F` | Success / confirmed / verified status |
| `--brick` | `#A8412C` | Urgent / error / rejected status |
| `--chalk` | `#F6F4EF` | Canvas background |
| `--slate` | `#64748B` | Secondary text, borders, neutral UI, pending/in-progress tint |

This is the full and only palette. Every color used anywhere in the product should map to one of these tokens (or a documented tint/shade of one) — no ad hoc hex values introduced per component.

### 3.2 Typography

| Role | Typeface | Notes |
|---|---|---|
| Display (headings, dashboard titles) | **Fraunces** (or a comparable high-contrast serif) | Used with restraint — page titles and section headers only, never body copy |
| Body (UI text, forms, descriptions) | **Inter** or **IBM Plex Sans** | Clean, high legibility at small sizes |
| Utility / data (room numbers, booking IDs, timestamps, ticket codes) | **IBM Plex Mono** | Reinforces the "engraved plate" motif — any identifier a user would look up or reference gets mono treatment |

### 3.3 Elevation & 3D Effect System

Five levels of depth, applied consistently across the app:

| Level | Use | Effect |
|---|---|---|
| **0 — Canvas** | Page background | Flat `--chalk`, no shadow |
| **1 — Resting plaque** | Default card/list row | Soft shadow (`0 1px 2px rgba(27,42,74,0.08), 0 1px 1px rgba(27,42,74,0.04)`), hairline border (`--slate` at 15% opacity), 3px brass gradient top-edge (`--brass` → `--brass-light`) |
| **2 — Hover / interactive** | Cards, buttons on hover | Shadow deepens (`0 4px 12px rgba(27,42,74,0.14)`), lifts `translateY(-2px)`, brass edge brightens |
| **3 — Modal / popover / overlay** | Confirmation dialogs, dropdowns, notification panel | Strongest shadow (`0 12px 32px rgba(27,42,74,0.24)`) + frosted-glass backdrop (`backdrop-filter: blur(8px)` over a semi-transparent Ink Navy scrim) |
| **4 — Pressed / active** | Button press, active nav item | Inset shadow (`inset 0 1px 3px rgba(27,42,74,0.25)`), slight compression (`scale(0.98)`), brass edge becomes a thin glowing ring |

**Rules:**
- Don't fake depth by adjusting opacity alone — use the correct shadow/level for the component's actual state.
- Only one Level 3 element on screen at a time.
- All lift/press transforms respect `prefers-reduced-motion` (shadows may still change; movement does not).

### 3.4 Gradients & Metallic Accents

Reserved for: the brass top-edge on plaque cards, primary CTA buttons (`--ink-navy` to an 8%-lighter navy, top-to-bottom), and the Level 3 modal backdrop scrim. Not used on backgrounds, body text, or large surfaces — the tactile/metallic effect stays concentrated on things meant to feel physically pressable or edged.

---

## 4. Information Architecture (Per Role)

### Student
`Dashboard → Reserve Lab | My Bookings | Submit Complaint | My Complaints | Scan Attendance | Lost & Found | Notifications`

### Faculty
`Dashboard → Book Room | Reserve Lab | Schedule Event | My Bookings | Generate Attendance QR | Attendance Reports | Equipment Requests`

### Hostel Warden
`Dashboard → Complaint Queue | Assign Staff | Hostel Reports`

### Maintenance Staff
`Dashboard → My Tasks | Update Status | Completion Upload`

### Administrator
`Dashboard → Users | Buildings/Rooms | Equipment | Bookings (approvals) | Reports & Analytics | Audit Logs | Notification Settings`

---

## 5. Core UI Patterns

### 5.1 Navigation
- Persistent sidebar (desktop) / bottom nav or hamburger (tablet-narrow) scoped to the current role's menu items, on `--ink-navy` background with `--chalk` text.
- Active route highlighted with a `--brass` left-edge indicator; breadcrumbs on nested detail pages (e.g., Complaint Queue → Complaint #1234).

### 5.2 The Plaque Card (Signature Component)

The default pattern for summarizing any single record — bookings, complaints, equipment, events:

- Level 1 elevation at rest, Level 2 on hover
- 3px brass gradient top-edge
- Primary identifier (room number, ticket ID) top-right in `IBM Plex Mono`, with a small-caps label above it in `--slate`
- Title in Fraunces, secondary metadata in Inter
- Status badge bottom-right per the mapping in §7
- 6px border radius — a plaque has a cut edge, not a soft rounded pill; avoid the 16–24px "friendly SaaS" default

### 5.3 Lists & Tables
- Server-driven pagination and filtering (matches `API.md` §1 conventions) — never load-all-then-filter-client-side for large collections.
- Rows use Level 1 elevation treatment sparingly (a hairline divider is usually enough in dense tables; full plaque-card styling is for grid/card views).
- Status shown as a badge per §7.
- Row click → detail view; avoid nested action menus for primary actions (cancel, assign) — keep them one click visible.

### 5.4 Forms
- React Hook Form + schema validation matching backend Pydantic models (per `RULES.md` §4.1).
- Inputs use a subtle inset treatment (recessed, not raised) to visually distinguish "editable surface" from the plaque cards around them.
- Inline field-level errors in `--brick`, not just a top-of-form summary.
- Multi-step forms (e.g., complaint submission with image) show progress, not a single overwhelming page.
- Disable submit while a request is in flight; button shows Level 4 (pressed) styling plus a loading indicator.

### 5.5 Booking / Availability UI
- Calendar-first view (monthly/weekly/daily, per `PRD.md` FR-5.3) for rooms/venues.
- Unavailable slots at Level 0 (flat, desaturated); available slots at Level 1 with a brass edge. Hovering/selecting a slot shows capacity + equipment tags.
- On conflict (`409` from API), show the specific conflicting time window returned by the backend — never a generic "try again" message.

### 5.6 Modals & Confirmations
- All modals render at Level 3 (glass backdrop + strongest shadow).
- Destructive/irreversible actions (cancel booking, reject complaint, deactivate user) require a Level 3 confirmation modal stating the consequence.
- Non-destructive actions (assign, update status) proceed without a confirmation step to keep workflows fast.

### 5.7 Notifications
- Bell icon with unread count badge (`--brick` fill) in the top nav; dropdown renders at Level 3.
- New real-time events (via Supabase Realtime) animate in / increment the badge without a page reload, respecting `prefers-reduced-motion`.

---

## 6. Accessibility

- All interactive elements keyboard-navigable; visible focus states use a `--brass` focus ring, consistent with the pressed-state visual language.
- Form inputs have associated `<label>` elements, not placeholder-only labeling.
- Color is never the sole indicator of status — pair status color with text/icon.
- Minimum contrast ratio 4.5:1 for body text (WCAG AA) — check specifically for text placed on `--brass` or `--ink-navy` fills, since both are mid-value colors that can fail contrast with the wrong text color.
- Images (complaint photos, lost & found) include descriptive `alt` text where feasible.
- Elevation transforms (lift, press, scale) are disabled under `prefers-reduced-motion`; shadow/color changes alone still communicate state.

---

## 7. Status & Priority Visual Language

| Status/Priority | Color | Treatment |
|---|---|---|
| Confirmed / Verified / Completed | `--quad-green` | Solid fill badge |
| Pending / In Progress / Assigned | `--brass` | Solid fill badge, subtle pulse only while genuinely awaiting action |
| Submitted (new, unassigned) | `--ink-navy` (10% tint) | Outline badge |
| Cancelled / Rejected | `--slate` | Muted/desaturated badge, no shadow — reads as "taken off the board" |
| Urgent / High priority | `--brick` | Solid fill badge, Level 2 shadow even at rest to visually demand attention |

Applies consistently across bookings, complaints, and maintenance requests.

---

## 8. Responsive Behavior

- **Desktop (primary target):** full sidebar navigation, multi-column dashboards, calendar grid views.
- **Tablet:** collapsible sidebar, single-column calendar (day view default).
- **Mobile:** out of scope for v1 layout optimization (a dedicated app is a future enhancement per `PRD.md` §10), but core flows (submit complaint, scan attendance) should remain usable, not broken, on a phone-width browser. Plaque cards stack full-width; elevation levels stay the same.

---

## 9. Empty & Error States

- Every list view has a designed empty state (e.g., "No complaints yet — submit one to get started" with a CTA) — can use a lighter version of the plaque motif (dashed brass edge) rather than a blank table.
- Network/API errors surface as a dismissible inline banner (`--brick` accent) near the relevant action, not a silent console-only failure.
- Loading states use skeleton placeholders shaped like the plaque card, not a generic spinner, to reduce perceived latency.

---

## 10. Dashboard & Analytics Visual Guidelines (Admin)

- Use Chart.js/Recharts with the defined palette (`--ink-navy`, `--brass`, `--quad-green`, `--brick`) for series/status coloring — never arbitrary chart-library defaults.
- One chart type per metric type: bar charts for utilization/counts, line charts for trends over time.
- Every chart has a clear title, axis labels, and a date-range filter control.
- Avoid dashboard overload — surface the KPIs listed in `PRD.md` §7 prominently; deeper breakdowns live behind drill-down/detail views.

---

## 11. Content & Tone

- System-facing microcopy (button labels, empty states, errors) is direct and action-oriented ("Book Room," not "Click here to reserve a room").
- Error messages state what happened and what to do next, avoiding raw backend error codes in user-facing text (map `error.code` to a friendly message).
