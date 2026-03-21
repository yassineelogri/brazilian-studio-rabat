# UI Polish — Soft Luxury Design Spec

## Goal

Improve the visual polish of the existing staff dashboard and client portal without changing any business logic or backend functionality. High-impact pages only (Approach 3): design tokens, sidebar, calendar, and client portal dashboard.

## Design Direction

**Soft Luxury** — deep rose gradient sidebar, rounded cards with warm shadows, Playfair Display italic for headings, blush background tones. Staff dashboard feels like a premium internal tool. Client portal stays lighter and faster on mobile.

## Constraints

- No changes to business logic, API routes, or data fetching
- No new dependencies (Playfair Display is already imported in `globals.css`)
- TypeScript must continue to pass (`npx tsc --noEmit --skipLibCheck`)
- `next build` must pass after all changes

---

## Section 1 — Design Tokens

### `tailwind.config.ts`

Add to the `colors` object under `salon-*`:

```ts
'salon-sidebar-bottom': '#4A2528',   // gradient stop for sidebar
'salon-cream-light':    '#FDF0F3',   // slightly pinker dashboard background
```

Add a `boxShadow` extension:

```ts
boxShadow: {
  'card':       '0 2px 8px rgba(107,58,63,0.10)',
  'card-hover': '0 4px 16px rgba(107,58,63,0.14)',
}
```

### `src/app/globals.css`

**Update `btn-primary`:**
```css
.btn-primary {
  @apply bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom text-white
         rounded-xl px-4 py-2 font-semibold text-sm
         shadow-card hover:shadow-card-hover hover:opacity-95
         transition-all duration-150 disabled:opacity-50;
}
```

**Update `btn-secondary`:**
```css
.btn-secondary {
  @apply border border-salon-rose/40 text-salon-muted bg-white rounded-xl
         px-4 py-2 text-sm font-medium
         hover:bg-salon-cream hover:border-salon-rose/60
         transition-all duration-150;
}
```

**Update `input-field`:**
```css
.input-field {
  @apply border border-salon-rose/30 rounded-xl px-3 py-2 text-sm
         focus:outline-none focus:ring-2 focus:ring-salon-gold/30
         focus:border-salon-gold/50 bg-white transition-all duration-150;
}
```

**Add `heading-serif` utility:**
```css
.heading-serif {
  @apply font-serif italic text-salon-dark;
}
```

---

## Section 2 — Dashboard Layout & Sidebar

**File:** `src/app/dashboard/layout.tsx`

### Sidebar

Replace the current fixed `w-56` sidebar with a hover-to-expand implementation:

- **Collapsed (default):** `w-16` (64px), icons only, centered
- **Expanded (on hover):** `w-52` (208px), icon + label per item
- **Transition:** `transition-all duration-300 ease-in-out` on width + label opacity
- **Background:** `bg-gradient-to-b from-salon-dark to-salon-sidebar-bottom`
- **Logo mark (collapsed):** 36×36px rose gradient rounded square with italic `BS`
- **Logo full (expanded):** brand mark + "Brazilian Studio" in Playfair italic + "RABAT ✦" subtext
- **Active item:** `bg-white/15 rounded-xl` with full-opacity label
- **Inactive item:** 60% opacity icon, label fades in on expand
- **Hover tooltip:** `title` attribute on each icon link (native tooltip when collapsed)
- **Logout:** bottom of sidebar, red-tinted hover

### Content area

- Change `ml-56` to `ml-16` (matches collapsed sidebar width)
- Background: `bg-salon-cream-light` instead of `bg-salon-cream`
- Add `peer` / `group` on sidebar so content area can shift: on sidebar hover, `ml-52` via CSS group-hover

### Mobile (≤ `md` breakpoint)

- Sidebar hidden by default (`-translate-x-full`)
- Hamburger button top-left of content area
- Clicking opens sidebar as a slide-out drawer overlay with `fixed inset-0 bg-black/30` backdrop
- Close on backdrop click or nav item click

---

## Section 3 — Calendar Page

**File:** `src/app/dashboard/calendar/page.tsx`
**Files:** `src/components/dashboard/CalendarDay.tsx`, `src/components/dashboard/AppointmentBlock.tsx`

### Day header

```tsx
<div>
  <h1 className="heading-serif text-2xl">{formattedDate}</h1>
  <p className="text-xs text-salon-muted tracking-widest uppercase mt-0.5">
    {count} RENDEZ-VOUS{pendingCount > 0 ? ` · ${pendingCount} EN ATTENTE` : ''}
  </p>
</div>
```

### Day/Week toggle buttons

- Active: `bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom text-white rounded-lg px-3 py-1.5 text-xs font-semibold`
- Inactive: `border border-salon-rose/40 text-salon-muted rounded-lg px-3 py-1.5 text-xs`

### AppointmentBlock (`AppointmentBlock.tsx`)

Replace the current flat-background card with:

```tsx
<div className="relative bg-white rounded-2xl shadow-card border border-salon-rose/25 overflow-hidden hover:shadow-card-hover transition-shadow duration-150">
  {/* Left accent bar — gradient */}
  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
       style={{ background: `linear-gradient(180deg, ${color}, ${color}88)` }} />
  <div className="pl-4 pr-3 py-3">
    <div className="flex justify-between items-start">
      <div>
        <p className="heading-serif text-sm">{serviceName}</p>
        <p className="text-xs text-salon-muted mt-0.5">{clientName}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-salon-gold">{duration}</p>
        <p className="text-xs text-salon-muted mt-0.5">{staffName}</p>
      </div>
    </div>
    <div className="mt-2">
      <StatusBadge status={status} />
    </div>
  </div>
</div>
```

### StatusBadge

Replace emoji-based status display with pill badges (no emoji):

| Status | Background | Text color |
|--------|-----------|------------|
| `confirmed` | `bg-green-50` | `text-green-700` |
| `pending` | `bg-amber-50` | `text-amber-700` |
| `cancelled` | `bg-gray-100` | `text-gray-500` |
| `completed` | `bg-blue-50` | `text-blue-700` |
| `no_show` | `bg-red-50` | `text-red-600` |

### Empty hour slots (CalendarDay)

Replace blank rows with a single hairline:
```tsx
<div className="flex items-center gap-2 h-6">
  <span className="text-xs text-salon-rose/60 w-8 text-right">{hour}h</span>
  <div className="flex-1 border-t border-salon-rose/15" />
</div>
```

---

## Section 4 — Client Portal

**Files:** `src/app/espace-client/dashboard/page.tsx`, `src/app/espace-client/page.tsx`

### Portal header (dashboard)

Replace the current white header bar with a deep rose gradient header:

```tsx
<div className="bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom px-5 pt-6 pb-5">
  <p className="text-xs text-salon-pink/70 tracking-widest uppercase">Bonjour</p>
  <h1 className="heading-serif text-3xl text-salon-pink mt-1">{clientName} ✦</h1>
  <p className="text-xs text-salon-pink/50 mt-1">Brazilian Studio Rabat</p>
</div>
```

### Appointment cards

- Background: `bg-white rounded-2xl shadow-card border border-salon-rose/20`
- Service name: `heading-serif text-base`
- Date/time: right-aligned, date in `text-salon-gold font-bold text-xs`, time in `text-salon-dark font-bold text-sm`
- Action buttons: separated by `border-t border-salon-rose/15 mt-3 pt-3`, two buttons side by side
  - Cancel: `btn-secondary text-salon-gold border-salon-gold/20`
  - Voir détails: `btn-primary text-xs py-1.5`
- Past appointments: `opacity-60`

### Bottom navigation shortcuts

Add a sticky footer row inside the page (not a fixed bar — just inline at page bottom):

```tsx
<div className="mt-6 pt-4 border-t border-salon-rose/20 flex justify-around">
  <Link href="/espace-client/devis" className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition">
    <FileText size={18} />
    <span className="text-xs">Devis</span>
  </Link>
  <Link href="/espace-client/factures" className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition">
    <Receipt size={18} />
    <span className="text-xs">Factures</span>
  </Link>
  <Link href="/espace-client/profile" className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition">
    <User size={18} />
    <span className="text-xs">Profil</span>
  </Link>
</div>
```

### Login page (`/espace-client`)

- Replace the plain white card with the same gradient header as the dashboard
- Center the email input below with more generous spacing
- `input-field` uses the updated token (rounder, softer focus ring)

---

## File Map

**Modified files only** (no new files created):

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `salon-sidebar-bottom`, `salon-cream-light`, shadow tokens |
| `src/app/globals.css` | Update `btn-primary`, `btn-secondary`, `input-field`; add `heading-serif` |
| `src/app/dashboard/layout.tsx` | Hover-to-expand sidebar, gradient background, mobile drawer |
| `src/app/dashboard/calendar/page.tsx` | Serif date header, updated toggle buttons |
| `src/components/dashboard/CalendarDay.tsx` | Hairline empty slots, updated layout |
| `src/components/dashboard/AppointmentBlock.tsx` | New card design, gradient accent bar, StatusBadge |
| `src/app/espace-client/dashboard/page.tsx` | Gradient header, polished appointment cards, bottom nav |
| `src/app/espace-client/page.tsx` | Gradient header on login page |

**Total: 8 files modified, 0 new files.**

---

## Out of Scope

These pages are **not touched** in this sprint:
- `/dashboard/staff`, `/dashboard/services`, `/dashboard/products`
- `/dashboard/ventes/*`, `/dashboard/devis/*`, `/dashboard/factures/*`
- `/espace-client/devis`, `/espace-client/factures`, `/espace-client/appointments/*`
- Public booking pages (`/booking/*`)
- Public marketing pages (Hero, About, Gallery, etc.)
