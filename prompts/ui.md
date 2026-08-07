# ui.md
## UI/Design Prompt — Smart Campus Infrastructure Platform

Load after `master-prompt.md`. Use for visual design, layout, and interaction-pattern work (complements `frontend.md`, which covers implementation mechanics).

---

## Design Direction

**Concept:** *The Campus Directory Board.* University buildings already have a visual language for wayfinding and status — brass room plaques, engraved directory boards, raised nameplates, ink-on-paper notice boards. This platform digitizes campus operations, so its interface borrows that physical vocabulary instead of looking like a generic SaaS admin panel. Every card reads like a plaque; every status reads like it's been stamped.

This is the signature element: **plaque cards** — a raised card with a beveled brass top-edge and a mono-spaced identifier (room number, booking ID, ticket number) rendered like it's engraved into the corner, the way a room plate reads "204."

Reference: `docs/UI_UX.md` (interaction patterns), `frontend.md` (implementation conventions).

---

## Visual Design System

### Color Palette

| Token | Hex | Use |
|---|---|---|
| `--ink-navy` | `#1B2A4A` | Primary brand color — nav, headers, primary text on light |
| `--brass` | `#B8863E` | Primary accent — CTAs, active states, plaque edges, focus rings |
| `--brass-light` | `#D9B876` | Gradient highlight on brass elements, hover glow |
| `--quad-green` | `#3F6B4F` | Success / confirmed / verified status |
| `--brick` | `#A8412C` | Urgent / error / rejected status |
| `--chalk` | `#F6F4EF` | Canvas background |
| `--slate` | `#64748B` | Secondary text, borders, neutral UI, pending/in-progress status (paired with `--brass-light` tint) |

Do not substitute a warm-cream-and-terracotta palette, a near-black-with-neon-accent palette, or a zero-radius broadsheet layout — those are generic AI-design defaults and are explicitly not this brief. Ink Navy + Brass is the identity; every other color is a supporting player.

### Typography

| Role | Typeface | Notes |
|---|---|---|
| Display (headings, dashboard titles) | **Fraunces** (or a similar high-contrast serif with character) | Used with restraint — page titles and section headers only, never body copy |
| Body (UI text, forms, descriptions) | **Inter** or **IBM Plex Sans** | Clean, high legibility at small sizes |
| Utility / data (room numbers, booking IDs, timestamps, ticket codes) | **IBM Plex Mono** | Reinforces the "engraved plate" motif — any identifier a user would look up or reference gets mono treatment |

### Elevation & 3D Effect System

Depth is used to communicate hierarchy and status, not decoration for its own sake. Five levels:

| Level | Use | Effect |
|---|---|---|
| **0 — Canvas** | Page background | Flat, `--chalk`, no shadow |
| **1 — Resting plaque** | Default card/list row state | Soft shadow (`0 1px 2px rgba(27,42,74,0.08), 0 1px 1px rgba(27,42,74,0.04)`), 1px hairline border in `--slate` at 15% opacity, 3px brass top-edge accent bar with a subtle gradient (`--brass` → `--brass-light`) to read as a beveled metal strip |
| **2 — Hover / interactive** | Cards, buttons on hover | Shadow deepens (`0 4px 12px rgba(27,42,74,0.14)`), lifts `translateY(-2px)`, brass edge brightens |
| **3 — Modal / popover / overlay** | Confirmation dialogs, dropdowns, notification panel | Strongest shadow (`0 12px 32px rgba(27,42,74,0.24)`) + frosted-glass backdrop (`backdrop-filter: blur(8px)` over a semi-transparent Ink Navy scrim) so the underlying dashboard is still legible but clearly backgrounded |
| **4 — Pressed / active** | Button press state, active nav item | Shadow inverts to a subtle inset (`inset 0 1px 3px rgba(27,42,74,0.25)`), element compresses slightly (`scale(0.98)`), brass edge becomes a thin glowing ring rather than a bar — reads as "pressed into" the surface |

**Rules for applying elevation:**
- Never skip a level for a fake sense of depth — a resting card is Level 1, not Level 2 with reduced opacity.
- Only one Level 3 element on screen at a time (a modal opening should visually recede everything else, not stack glass on glass).
- Respect `prefers-reduced-motion`: the lift/press transforms are disabled (shadows can still change) for users who've requested reduced motion.

### Status Color Mapping (extends `docs/UI_UX.md` §5)

| Status | Color | Visual treatment |
|---|---|---|
| Confirmed / Verified / Completed | `--quad-green` | Solid fill badge + engraved-style checkmark |
| Pending / In Progress / Assigned | `--brass` | Solid fill badge, subtle pulse animation only while genuinely awaiting action |
| Submitted (new, unassigned) | `--ink-navy` (tinted 10%) | Outline badge |
| Cancelled / Rejected | `--slate` | Muted/desaturated badge, no shadow (reads as "taken off the board") |
| Urgent / High priority | `--brick` | Solid fill badge, Level 2 shadow even at rest to visually demand attention |

Color is always paired with text — never the sole signal (accessibility requirement carried over from `docs/UI_UX.md` §4).

### Signature Component: The Plaque Card

Applies to booking cards, complaint cards, equipment records, event listings — anywhere a single record is summarized in a list or grid:

- Level 1 elevation at rest, Level 2 on hover
- 3px brass gradient top-edge
- Primary identifier (room number, ticket ID) top-right in `IBM Plex Mono`, small caps label above it in `--slate`
- Title in Fraunces, secondary metadata in Inter
- Status badge bottom-right per the mapping above
- Border radius: 6px (a plaque has a cut edge, not a soft rounded pill — avoid the 16–24px "friendly SaaS" radius default)

### Gradients & Metallic Accents

Use sparingly, only on: the brass top-edge of plaque cards, primary CTA buttons (subtle `--ink-navy` → a 8% lighter navy, top-to-bottom, to suggest a pressed metal button), and the Level 3 modal backdrop scrim. Do not apply gradients to backgrounds, body text, or large surface areas — the palette stays disciplined and the metallic/dimensional effect stays concentrated on things that are meant to feel tactile (buttons, edges, badges).

---

## Instructions for the AI Assistant

1. **Design for the role, not a generic dashboard.** Before laying out a screen, confirm which of the five roles it's for and reference the role-specific information architecture in `docs/UI_UX.md` §2 — don't design a one-size-fits-all dashboard that just hides pieces per role.

2. **Apply the token system above, not ad hoc colors.** Every color used in a component should map to a named token (`--ink-navy`, `--brass`, etc.). If a new color seems necessary, treat that as a decision point to flag, not something to invent silently.

3. **Status must always be visible and unambiguous**, using the status color mapping above — paired with text, never color alone.

4. **Core actions stay within 1–2 clicks** from the relevant role's dashboard (book a room, submit a complaint, scan attendance) — don't bury primary actions in nested menus.

5. **Use the plaque card pattern for any record summary** (bookings, complaints, equipment, events). Reuse it consistently rather than inventing a new card style per module.

6. **Apply the elevation system deliberately** — match the component to the correct level (1 for resting cards, 2 for hover, 3 for modals/overlays, 4 for pressed states). Don't add shadows or lift effects outside this scale.

7. **Booking/availability views are calendar-first** (monthly/weekly/daily), with unavailable slots visually distinct (Level 0, desaturated) from available ones (Level 1, brass-edged).

8. **Design the empty, loading, and error states explicitly** for every new screen. Empty states include a clear call-to-action and can use a lighter version of the plaque motif (dashed brass edge, "no plate here yet"); loading states use skeletons matching the plaque card shape; errors are actionable, not raw technical messages.

9. **Confirmations only for destructive/irreversible actions** — use a Level 3 modal for these, never a Level 1 inline element.

10. **Real-time feel:** any status that can change from another user's action should transition its badge/elevation smoothly (respecting `prefers-reduced-motion`), not just hard-swap on refresh.

11. **Accessibility is not optional:** keyboard navigation, visible focus states (use a `--brass` focus ring, consistent with the pressed-state treatment), labeled inputs, 4.5:1 contrast minimum for body text — verify contrast specifically for text placed on `--brass` or `--ink-navy` fills.

12. **Admin dashboards/analytics:** one chart type per metric type, using the palette above (Ink Navy + Brass + Quad Green + Brick for series/status colors, never arbitrary chart-library defaults), clear titles/axis labels, date-range filtering, prioritizing the KPIs from `PRD.md` §7.

---

## Checklist Before Returning UI/Design Work

- [ ] Correct role-specific information architecture applied
- [ ] All colors map to the defined token system (no ad hoc hex values)
- [ ] Status shown with color + text/icon, matching the standard mapping
- [ ] Elevation level matches component state (1 resting / 2 hover / 3 modal / 4 pressed)
- [ ] Plaque card pattern used for record summaries, consistently across modules
- [ ] Core actions reachable in 1–2 clicks from the dashboard
- [ ] Empty, loading, and error states explicitly designed
- [ ] Confirmation only added for genuinely destructive actions, using a Level 3 modal
- [ ] Accessibility basics covered (contrast on brass/navy fills, labels, keyboard nav, reduced-motion respected)
