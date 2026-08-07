# frontend.md
## Frontend Development Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use for any React/Vite/Tailwind work.

---

## Context

Frontend stack: **React 19 + TypeScript (Vite) + Tailwind CSS + React Router + Axios + TanStack Query + React Hook Form + Chart.js/Recharts**. All frontend code is TypeScript — no plain `.js`/`.jsx` files, no `any` used to sidestep typing.

Reference: `docs/UI_UX.md` (design patterns), `RULES.md` §4 (frontend rules), `docs/API.md` (endpoint contracts to consume).

---

## Instructions for the AI Assistant

When generating or modifying frontend code:

1. **Folder placement:** Feature-based — put new code under `features/<domain>/` (e.g., `features/booking/`, `features/complaints/`). Shared primitives go in `components/ui/`. Do not create a new top-level structure without checking existing conventions first.

2. **Server state:** Use **TanStack Query** for anything that comes from the API (bookings, complaints, equipment, etc.). Never mirror server data into `useState` as a second source of truth — query cache is the source of truth, mutations invalidate/refetch it.

3. **Forms:** Use **React Hook Form**. Validation schema should mirror the corresponding backend Pydantic model shape from `docs/API.md` — if the backend requires a field, the frontend schema requires it too, with matching constraints (string length, enum values, etc.).

4. **Role-aware rendering:** Every component that renders role-specific actions must check the current user's role (from auth context) before rendering, per `docs/UI_UX.md` §2. This is UX polish only — pair it with route guards, and remember the backend is the actual security boundary (never the reason to skip a backend check on the corresponding endpoint).

5. **Styling:** Tailwind utility classes only. Match the status color mapping in `docs/UI_UX.md` §5 for any status/priority badge. Don't introduce new colors/spacing ad hoc.

6. **Real-time:** For anything that should update live (booking confirmations, complaint status, notifications), wire a Supabase Realtime subscription rather than polling. Always clean up the subscription on unmount.

7. **Error & loading states:** Every data-fetching component needs a designed loading state (skeleton, not just a spinner, per `docs/UI_UX.md` §7) and an error state (inline banner, not a silent failure). Every list needs a designed empty state.

8. **API errors:** When handling a `409` conflict response from booking/event endpoints, surface the specific conflicting window from `error.details` (per `docs/API.md` §5) — don't show a generic failure message.

9. **Accessibility:** Labeled form inputs, keyboard-navigable interactive elements, status conveyed via text/icon in addition to color (`docs/UI_UX.md` §4).

---

## Checklist Before Returning Frontend Code

- [ ] Written in TypeScript with meaningful types (no unjustified `any`)
- [ ] Matches folder/feature structure conventions
- [ ] Server state via TanStack Query, not duplicated local state
- [ ] Form validation matches backend contract
- [ ] Role-aware rendering applied where relevant
- [ ] Tailwind-only styling, consistent status colors
- [ ] Loading / error / empty states designed, not omitted
- [ ] Real-time subscriptions cleaned up on unmount (if used)
