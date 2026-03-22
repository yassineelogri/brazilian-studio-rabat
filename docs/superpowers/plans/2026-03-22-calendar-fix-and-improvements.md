# Calendar Fix + App Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the calendar showing zero appointments (RLS bypass via server API), fix time-slot availability for anonymous users, and improve the dashboard home page with live stats.

**Architecture:** Move all staff-facing Supabase reads to server-side API routes that use the service role key — this bypasses RLS entirely and removes dependency on `is_staff()` being correctly seeded. The booking availability check (TimeStep) moves to a dedicated public API route. Dashboard home gets a real stats page instead of a redirect.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (service role), Tailwind v4, framer-motion, lucide-react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/appointments/route.ts` | Modify (add GET) | Server-side appointment fetch for staff calendar |
| `src/app/api/appointments/availability/route.ts` | Create | Public slot availability check for booking form |
| `src/app/dashboard/calendar/page.tsx` | Modify | Use fetch() instead of supabase client directly |
| `src/components/booking/TimeStep.tsx` | Modify | Call `/api/appointments/availability` instead of supabase client |
| `src/app/dashboard/page.tsx` | Modify | Replace redirect with real stats dashboard |
| `src/components/dashboard/StatCard.tsx` | Create | Reusable animated stat card |

---

## Task 1: Add GET handler to `/api/appointments` (staff calendar reads)

**Files:**
- Modify: `src/app/api/appointments/route.ts`

The calendar page calls `supabase.from('appointments')` with the browser anon key, which is blocked by RLS unless `is_staff()` returns true. Fix: add a `GET` handler that uses `createServerSupabaseClient()` (service role) — no RLS applies.

- [ ] **Step 1: Add GET export to the existing route file**

Open `src/app/api/appointments/route.ts` and add this after the existing imports:

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rangeStart = searchParams.get('from')
  const rangeEnd   = searchParams.get('to')

  if (!rangeStart || !rangeEnd) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      clients(name, phone, email),
      services(name, color),
      staff(name)
    `)
    .gte('date', rangeStart)
    .lte('date', rangeEnd)
    .order('start_time')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd src/app/api/appointments && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/appointments/route.ts
git commit -m "feat: add GET /api/appointments with service-role for staff calendar"
```

---

## Task 2: Update calendar page to use the new GET endpoint

**Files:**
- Modify: `src/app/dashboard/calendar/page.tsx`

Replace the direct `supabase.from('appointments')` call inside `fetchAppointments` with a `fetch('/api/appointments?from=...&to=...')` call.

- [ ] **Step 1: Replace `fetchAppointments` body**

Find the `fetchAppointments` useCallback in `src/app/dashboard/calendar/page.tsx` and replace its body:

```typescript
const fetchAppointments = useCallback(async () => {
  try {
    const res = await fetch(
      `/api/appointments?from=${rangeStart}&to=${rangeEnd}`
    )
    if (!res.ok) {
      setFetchError('Impossible de charger les rendez-vous.')
      setAppointments([])
      return
    }
    const data = await res.json()
    setFetchError(null)
    setAppointments(Array.isArray(data) ? data : [])
  } catch {
    setFetchError('Erreur réseau.')
    setAppointments([])
  } finally {
    setLoading(false)
  }
}, [rangeStart, rangeEnd])
```

- [ ] **Step 2: Remove unused imports**

Remove the `supabase` import from `@/lib/supabase/client` — it's no longer used in this file.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/calendar/page.tsx
git commit -m "fix: calendar reads via /api/appointments (service-role, bypasses RLS)"
```

---

## Task 3: Create public availability endpoint for booking form

**Files:**
- Create: `src/app/api/appointments/availability/route.ts`

The `TimeStep` component queries Supabase directly with the anon key. Anonymous users have no RLS access, so `bookedSlots` is always empty and all time slots appear available. Fix: a public GET route that returns only `start_time` and `end_time` for a given date — no auth required (uses service role, but returns minimal non-sensitive data).

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/appointments/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('date', date)
    .in('status', ['pending', 'confirmed'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Update TimeStep to call the new endpoint**

In `src/components/booking/TimeStep.tsx`, replace the `fetchBooked` function body:

```typescript
async function fetchBooked() {
  setLoading(true)
  try {
    const res = await fetch(`/api/appointments/availability?date=${date}`)
    if (!res.ok) { setBookedSlots([]); return }
    const data = await res.json()
    setBookedSlots(Array.isArray(data) ? data : [])
  } catch {
    setBookedSlots([])
  } finally {
    setLoading(false)
  }
}
```

Remove the `createClient` import from TimeStep — no longer needed.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/appointments/availability/route.ts src/components/booking/TimeStep.tsx
git commit -m "fix: time-slot availability uses server-side API (fixes anon RLS block)"
```

---

## Task 4: SQL — link staff auth_user_id (data fix)

**Files:**
- New migration: `supabase/migrations/006_link_staff_auth.sql`

This is a template migration the user runs in the Supabase SQL editor to link their auth user to the staff table. It cannot be automated because the UUID is account-specific.

- [ ] **Step 1: Create the migration file as documentation**

```sql
-- supabase/migrations/006_link_staff_auth.sql
-- Run this in Supabase SQL Editor after getting your user UUID from:
--   Authentication > Users > copy the UUID of your staff user
--
-- Replace 'YOUR-AUTH-USER-UUID-HERE' with the actual UUID.

UPDATE staff
SET auth_user_id = 'YOUR-AUTH-USER-UUID-HERE'
WHERE name = 'YOUR-STAFF-NAME-HERE'
  AND auth_user_id IS NULL;

-- Verify:
SELECT id, name, role, auth_user_id FROM staff;
```

- [ ] **Step 2: Commit the migration template**

```bash
git add supabase/migrations/006_link_staff_auth.sql
git commit -m "docs: add migration template to link staff auth_user_id"
```

- [ ] **Step 3: Instruct user to run the data fix**

Tell the user: go to **Supabase Dashboard → SQL Editor**, paste the query with their real UUID and staff name, run it. Verify the `auth_user_id` column is populated.

---

## Task 5: Dashboard home page with live stats

**Files:**
- Modify: `src/app/dashboard/page.tsx` — replace redirect with async server component that shows stats
- Create: `src/components/dashboard/StatCard.tsx` — reusable animated stat card

The current `dashboard/page.tsx` just redirects to the calendar. Replace it with a real overview: today's appointments count, pending count, this week's revenue (from sales), and total clients.

- [ ] **Step 1: Create StatCard component**

```typescript
// src/components/dashboard/StatCard.tsx
interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string // tailwind color class for the top border
}

export default function StatCard({ label, value, sub, accent = 'bg-salon-gold' }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-salon-rose/15 shadow-card p-5 flex flex-col gap-2">
      <div className={`h-0.5 w-8 rounded-full ${accent}`} />
      <p className="text-xs text-salon-muted uppercase tracking-widest">{label}</p>
      <p className="font-serif text-3xl text-salon-dark leading-none">{value}</p>
      {sub && <p className="text-xs text-salon-muted">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite dashboard page**

```typescript
// src/app/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/StatCard'
import Link from 'next/link'
import { CalendarDays, Clock, Users, TrendingUp } from 'lucide-react'

export const revalidate = 60 // refresh stats every minute

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Today's appointments
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('date', today)
    .in('status', ['pending', 'confirmed'])

  // Pending appointments (all upcoming)
  const { data: pendingAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('status', 'pending')
    .gte('date', today)

  // Total clients
  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })

  // This week's revenue (Monday → today)
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const mondayStr = monday.toISOString().split('T')[0]

  const { data: weekSales } = await supabase
    .from('sales')
    .select('total_ttc')
    .gte('created_at', mondayStr)

  const weekRevenue = (weekSales ?? []).reduce((sum, s) => sum + (s.total_ttc ?? 0), 0)

  const todayCount   = todayAppts?.length ?? 0
  const pendingCount = pendingAppts?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-salon-muted tracking-widest uppercase">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-serif text-3xl text-salon-dark mt-1">Bonjour ✦</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Aujourd'hui"
          value={todayCount}
          sub={todayCount === 1 ? 'rendez-vous' : 'rendez-vous'}
          accent="bg-salon-gold"
        />
        <StatCard
          label="En attente"
          value={pendingCount}
          sub="à confirmer"
          accent="bg-amber-400"
        />
        <StatCard
          label="Clients"
          value={clientCount ?? 0}
          sub="au total"
          accent="bg-salon-rose"
        />
        <StatCard
          label="Cette semaine"
          value={`${weekRevenue.toLocaleString('fr-FR')} MAD`}
          sub="chiffre d'affaires"
          accent="bg-green-400"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-2 px-4 py-2.5 bg-salon-dark text-salon-pink rounded-xl text-sm font-medium hover:bg-salon-sidebar-bottom transition-colors"
        >
          <CalendarDays size={15} /> Voir le calendrier
        </Link>
        <Link
          href="/dashboard/appointments/new"
          className="flex items-center gap-2 px-4 py-2.5 border border-salon-rose/30 text-salon-dark rounded-xl text-sm font-medium hover:border-salon-gold hover:text-salon-gold transition-colors"
        >
          <Clock size={15} /> Nouveau RDV
        </Link>
        <Link
          href="/dashboard/ventes/new"
          className="flex items-center gap-2 px-4 py-2.5 border border-salon-rose/30 text-salon-dark rounded-xl text-sm font-medium hover:border-salon-gold hover:text-salon-gold transition-colors"
        >
          <TrendingUp size={15} /> Nouvelle vente
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/dashboard/StatCard.tsx
git commit -m "feat: dashboard home with live stats (today RDV, pending, clients, revenue)"
```

---

## Task 6: Push and verify

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: Exit 0, no errors.

- [ ] **Step 2: Push to remote**

```bash
git push origin feature/v1-appointments
```

- [ ] **Step 3: Merge to main for production**

```bash
cd /path/to/main-worktree
git checkout main
git pull origin main
git merge feature/v1-appointments --no-ff -m "feat: fix calendar RLS + dashboard stats home"
git push origin main
```

- [ ] **Step 4: Tell user to run the SQL data fix**

In Supabase SQL Editor:
```sql
-- Replace values with your actual UUID and staff name
UPDATE staff SET auth_user_id = 'YOUR-UUID' WHERE name = 'YOUR-NAME';
SELECT id, name, auth_user_id FROM staff;
```

---

## Summary of Root Causes Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Calendar empty | `supabase` browser client blocked by RLS (no `auth_user_id` in `staff` table) | `GET /api/appointments` using service role |
| All time slots show available | `TimeStep` anon query blocked by RLS → empty `bookedSlots` | `GET /api/appointments/availability` using service role |
| Staff can't see appointments even when logged in | `staff.auth_user_id` not linked to `auth.users.id` | SQL data fix + server-side reads remove dependency on this |
