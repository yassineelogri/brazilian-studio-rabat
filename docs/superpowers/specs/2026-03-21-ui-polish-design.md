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

The existing `salon` color object is a nested object (`salon: { pink, rose, gold, dark, cream, muted }`). Add two new keys **inside** that same `salon: {}` object:

```ts
salon: {
  // existing keys unchanged ...
  'sidebar-bottom': '#4A2528',   // gradient stop for sidebar — used as bg-salon-sidebar-bottom
  'cream-light':    '#FDF0F3',   // slightly pinker dashboard background — bg-salon-cream-light
}
```

Add a `fontFamily.serif` entry (Playfair Display is already imported in `globals.css` via Google Fonts):

```ts
fontFamily: {
  sans:  ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
  serif: ['Playfair Display', 'serif'],   // new — powers font-serif / heading-serif
}
```

Add a `boxShadow` extension:

```ts
boxShadow: {
  'card':       '0 2px 8px rgba(107,58,63,0.10)',
  'card-hover': '0 4px 16px rgba(107,58,63,0.14)',
}
```

### `src/app/globals.css`

`btn-primary`, `btn-secondary`, and `input-field` are currently used as class names across the codebase but have **no CSS definition**. This sprint **defines** them for the first time inside an `@layer components` block. These definitions will apply site-wide to all existing usages.

Add after the existing utility classes:

```css
@layer components {
  .btn-primary {
    @apply bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom text-white
           rounded-xl px-4 py-2 font-semibold text-sm
           shadow-card hover:shadow-card-hover hover:opacity-95
           transition-all duration-150 disabled:opacity-50 cursor-pointer;
  }

  .btn-secondary {
    @apply border border-salon-rose/40 text-salon-muted bg-white rounded-xl
           px-4 py-2 text-sm font-medium
           hover:bg-salon-cream hover:border-salon-rose/60
           transition-all duration-150 cursor-pointer;
  }

  .input-field {
    @apply border border-salon-rose/30 rounded-xl px-3 py-2 text-sm
           focus:outline-none focus:ring-2 focus:ring-salon-gold/30
           focus:border-salon-gold/50 bg-white transition-all duration-150;
  }

  .heading-serif {
    @apply font-serif italic text-salon-dark;
  }
}
```

**Note:** `globals.css` already has `.button-primary` and `.button-outline` (used by the public marketing pages). Do not remove or rename them — they are different from the dashboard's `btn-primary`.

---

## Section 2 — Dashboard Layout & Sidebar

**File:** `src/app/dashboard/layout.tsx`

### Sidebar — hover-to-expand with CSS peer

Use Tailwind's `peer` variant (works on subsequent siblings). Mark the `<aside>` with `peer` and use `peer-hover:` on the `<main>` for the margin shift.

```tsx
<aside className="peer fixed left-0 top-0 h-full z-40
                  w-16 hover:w-52
                  transition-all duration-300 ease-in-out
                  bg-gradient-to-b from-salon-dark to-salon-sidebar-bottom
                  flex flex-col items-center hover:items-start
                  overflow-hidden">

  {/* Logo mark */}
  <div className="flex items-center gap-3 px-3 pt-4 pb-5 w-full">
    <div className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center
                    bg-gradient-to-br from-salon-pink to-salon-gold">
      <span className="font-serif italic text-white text-sm font-semibold">BS</span>
    </div>
    {/* Label hidden when collapsed, fades in on expand */}
    <div className="opacity-0 peer-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
      <p className="font-serif italic text-salon-pink text-xs leading-tight">Brazilian Studio</p>
      <p className="text-salon-pink/50 text-[9px] tracking-widest">RABAT ✦</p>
    </div>
  </div>

  {/* Nav items — see below */}
</aside>

<main className="ml-16 peer-hover:ml-52 transition-all duration-300 ease-in-out
                 min-h-screen bg-salon-cream-light p-6">
  {children}
</main>
```

**Important:** `peer-hover:` requires the `<main>` to be a **direct subsequent sibling** of the `<aside>`. Do not wrap them in separate containers.

### Nav item pattern

Each nav link follows this structure (icon always visible, label fades in):

```tsx
<Link href="/dashboard/calendar"
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                  transition-all duration-150
                  ${isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
      title="Calendrier">  {/* title = native tooltip when collapsed */}
  <CalendarIcon size={18} className="flex-shrink-0" />
  <span className="text-xs font-medium whitespace-nowrap overflow-hidden
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200">
    Calendrier
  </span>
</Link>
```

**Note:** The label `<span>` uses opacity transition, not width, so it doesn't affect layout. The sidebar width controls visibility via `overflow-hidden`.

### Mobile (≤ `md` breakpoint)

Mobile uses JavaScript state (a `useState` boolean) instead of CSS hover, since hover doesn't work on touch:

- On `md:` and up: use the peer/hover CSS approach above
- Below `md:`: sidebar is `fixed -translate-x-full` by default; a hamburger `<button>` in the top-left of `<main>` toggles `translate-x-0`; a `fixed inset-0 bg-black/30` backdrop closes it on click
- Nav item click also closes the drawer on mobile

Add to `layout.tsx`:
```tsx
const [mobileOpen, setMobileOpen] = useState(false)
```

---

## Section 3 — Calendar Page

**File:** `src/app/dashboard/calendar/page.tsx`
**Files:** `src/components/dashboard/CalendarDay.tsx`, `src/components/dashboard/AppointmentBlock.tsx`

### Day header (`calendar/page.tsx`)

Replace the current date heading with:

```tsx
<div>
  <h1 className="heading-serif text-2xl">{formattedDate}</h1>
  <p className="text-xs text-salon-muted tracking-widest uppercase mt-0.5">
    {count} RENDEZ-VOUS{pendingCount > 0 ? ` · ${pendingCount} EN ATTENTE` : ''}
  </p>
</div>
```

Where `formattedDate` is the existing date formatted as a full French string (e.g. "Mercredi 26 mars").

### Day/Week toggle buttons

- Active: `bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom text-white rounded-lg px-3 py-1.5 text-xs font-semibold`
- Inactive: `border border-salon-rose/40 text-salon-muted rounded-lg px-3 py-1.5 text-xs hover:bg-salon-cream`

### `AppointmentBlock.tsx` — new card layout

The existing component receives a single `appointment` prop of type `AppointmentWithRelations` (or similar). **Do not change the Props interface or callers.** Derive display values from the existing prop:

```tsx
// Derive from existing appointment prop — no prop interface changes
const serviceName = appointment.appointment_services?.[0]?.service?.name ?? 'RDV'
const clientName  = appointment.clients?.name ?? ''
const staffName   = appointment.staff?.name ?? ''
const color       = appointment.appointment_services?.[0]?.service?.color ?? '#B76E79'
const durationMin = appointment.duration_minutes ?? 60
const duration    = `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2,'0') : '00'}`
```

Replace the current card JSX with:

```tsx
<div className="relative bg-white rounded-2xl shadow-card border border-salon-rose/25
                overflow-hidden hover:shadow-card-hover transition-shadow duration-150 cursor-pointer"
     onClick={onClick}>
  {/* Gradient accent bar */}
  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
       style={{ background: `linear-gradient(180deg, ${color}, ${color}88)` }} />
  <div className="pl-4 pr-3 py-3">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="heading-serif text-sm truncate">{serviceName}</p>
        <p className="text-xs text-salon-muted mt-0.5 truncate">{clientName}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-salon-gold">{duration}</p>
        <p className="text-xs text-salon-muted mt-0.5">{staffName}</p>
      </div>
    </div>
    <div className="mt-2">
      {/* StatusBadge — inline component, defined below in the same file */}
      <StatusBadge status={appointment.status} />
    </div>
  </div>
</div>
```

**`StatusBadge` is an inline component defined at the top of `AppointmentBlock.tsx`** (not a separate file):

```tsx
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Confirmé'  },
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'En attente'},
  cancelled: { bg: 'bg-gray-100',  text: 'text-gray-500',   label: 'Annulé'    },
  completed: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Terminé'   },
  no_show:   { bg: 'bg-red-50',    text: 'text-red-600',    label: 'Absent'    },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: status }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}
```

### Empty hour slots (`CalendarDay.tsx`)

Replace blank/empty hour rows with a hairline rule:

```tsx
<div className="flex items-center gap-2 h-6">
  <span className="text-xs text-salon-rose/60 w-8 text-right flex-shrink-0">{hour}h</span>
  <div className="flex-1 border-t border-salon-rose/15" />
</div>
```

---

## Section 4 — Client Portal

**Files:** `src/app/espace-client/dashboard/page.tsx`, `src/app/espace-client/page.tsx`

### Portal header (`espace-client/dashboard/page.tsx`)

Replace the current white header bar with:

```tsx
<div className="bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom px-5 pt-6 pb-5">
  <p className="text-xs text-salon-pink/70 tracking-widest uppercase">Bonjour</p>
  <h1 className="heading-serif text-3xl text-salon-pink mt-1">{clientName} ✦</h1>
  <p className="text-xs text-salon-pink/50 mt-1">Brazilian Studio Rabat</p>
</div>
```

Where `clientName` is already available in the component state.

### Appointment cards

- Container: `bg-white rounded-2xl shadow-card border border-salon-rose/20`
- Service name: `className="heading-serif text-base"`
- Layout: service name + client info on left; date + time right-aligned on right
  - Date: `text-xs font-bold text-salon-gold`
  - Time: `text-sm font-bold text-salon-dark`
- Divider + buttons row: `border-t border-salon-rose/15 mt-3 pt-3 flex gap-2`
  - Cancel button: `btn-secondary flex-1 text-xs`
  - "Voir détails" link-button: `btn-primary flex-1 text-xs text-center`
- Past appointments: wrap in `<div className="opacity-60">`

### Bottom navigation shortcuts

Add after the past appointments list. Requires importing `FileText`, `Receipt`, `User` from `lucide-react` (add to existing import line):

```tsx
<div className="mt-6 pt-4 border-t border-salon-rose/20 flex justify-around">
  <Link href="/espace-client/devis"
        className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
    <FileText size={18} />
    <span className="text-xs">Devis</span>
  </Link>
  <Link href="/espace-client/factures"
        className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
    <Receipt size={18} />
    <span className="text-xs">Factures</span>
  </Link>
  <Link href="/espace-client/profile"
        className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
    <User size={18} />
    <span className="text-xs">Profil</span>
  </Link>
</div>
```

### Login page (`espace-client/page.tsx`)

- Replace the plain white outer card/container with the same `bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom` header block (same JSX as dashboard header, but without the client name — show the studio logo/name only)
- Email input and submit button sit below in a white rounded card
- `input-field` and `btn-primary` classes will pick up the new styles automatically once defined in `globals.css`

---

## File Map

**Modified files only** (no new files created):

| File | Change |
|------|--------|
| `tailwind.config.ts` | Nest `sidebar-bottom` + `cream-light` inside `salon:{}`, add `fontFamily.serif`, add `boxShadow` tokens |
| `src/app/globals.css` | **Define** `btn-primary`, `btn-secondary`, `input-field`, `heading-serif` in `@layer components` (first-time definitions, not updates) |
| `src/app/dashboard/layout.tsx` | Peer-based hover-to-expand sidebar, gradient background, `useState` mobile drawer |
| `src/app/dashboard/calendar/page.tsx` | Serif date header, updated toggle buttons |
| `src/components/dashboard/CalendarDay.tsx` | Hairline empty hour rows |
| `src/components/dashboard/AppointmentBlock.tsx` | New card design, gradient accent bar, inline `StatusBadge` component |
| `src/app/espace-client/dashboard/page.tsx` | Gradient header, polished cards, bottom nav shortcuts |
| `src/app/espace-client/page.tsx` | Gradient header on login page |

**Total: 8 files modified, 0 new files.**

---

## Out of Scope

The `bg-salon-cream` token remains unchanged — out-of-scope pages continue using it. Only `layout.tsx` switches to `bg-salon-cream-light` for the dashboard shell background.

These pages are **not touched** in this sprint:
- `/dashboard/staff`, `/dashboard/services`, `/dashboard/products`
- `/dashboard/ventes/*`, `/dashboard/devis/*`, `/dashboard/factures/*`
- `/espace-client/devis`, `/espace-client/factures`, `/espace-client/appointments/*`
- Public booking pages (`/booking/*`)
- Public marketing pages (Hero, About, Gallery, etc.)
