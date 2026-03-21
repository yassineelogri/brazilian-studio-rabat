# V4 Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-facing portal at `/espace-client` where salon clients can view/cancel appointments, book new ones, view their devis & factures, and update their profile — authenticated via Supabase magic link or private booking token.

**Architecture:** Hybrid read/write pattern identical to V1–V3: browser reads directly from Supabase (anon key + RLS), writes go through Next.js API routes (service_role). Two auth paths: Supabase PKCE magic link for the full portal, and private 30-day tokens for single-booking access without login.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + RLS + `@supabase/ssr`), Resend (email)

---

## File Map

**New files:**
- `supabase/migrations/004_client_portal.sql` — DB migration (generated column, booking_tokens, RLS)
- `src/lib/supabase/types.ts` — add `BookingToken` type, `starts_at` to `Appointment`
- `src/lib/email-templates.ts` — add `bookingConfirmationEmail()`
- `src/app/api/client/auth/magic-link/route.ts` — POST: send magic link
- `src/app/api/client/auth/callback/route.ts` — GET: PKCE exchange + client linking
- `src/app/api/client/appointments/route.ts` — GET: client's appointments list
- `src/app/api/client/appointments/[id]/cancel/route.ts` — POST: authenticated cancel
- `src/app/api/client/profile/route.ts` — GET + PATCH: client profile
- `src/app/api/client/tokens/route.ts` — POST: staff generates private token
- `src/app/api/client/tokens/[token]/route.ts` — GET: resolve token → booking
- `src/app/api/client/tokens/[token]/cancel/route.ts` — POST: cancel via token
- `src/app/espace-client/page.tsx` — login page
- `src/app/espace-client/dashboard/page.tsx` — timeline dashboard
- `src/app/espace-client/appointments/[id]/page.tsx` — appointment detail + cancel
- `src/app/espace-client/devis/page.tsx` — client's quotes list (read-only)
- `src/app/espace-client/factures/page.tsx` — client's invoices list (read-only)
- `src/app/espace-client/profile/page.tsx` — update name + phone
- `src/app/espace-client/acces/[token]/page.tsx` — private token view

**Modified files:**
- `src/middleware.ts` — add `/espace-client/:path*` protection
- `src/lib/api-helpers.ts` — add `requireClient()` helper
- `src/app/api/appointments/route.ts` — add token generation + confirmation email
- `src/app/dashboard/calendar/page.tsx` — add "Lien privé" button per appointment

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/004_client_portal.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- V4: Client Portal
-- ============================================================

-- 1. Add starts_at generated column to appointments
--    Combines date + start_time into a single UTC-comparable timestamptz.
--    'Africa/Casablanca' is UTC+1 (no DST for Morocco since 2018).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS starts_at timestamptz
    GENERATED ALWAYS AS ((date + start_time) AT TIME ZONE 'Africa/Casablanca') STORED;

-- 2. Helper: returns the clients.id for the current Supabase auth user
CREATE OR REPLACE FUNCTION get_client_id()
RETURNS uuid AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Booking tokens (one per appointment, auto-refreshable)
CREATE TABLE IF NOT EXISTS booking_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_tokens_appointment_id_key UNIQUE (appointment_id)
);

ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
-- No client RLS needed — accessed only via service_role in API routes

-- 4. RLS: clients can read their own rows
CREATE POLICY "clients can view own profile"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "clients can view own appointments"
  ON appointments FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis"
  ON devis FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis_items"
  ON devis_items FOR SELECT
  USING (devis_id IN (SELECT id FROM devis WHERE client_id = get_client_id()));

CREATE POLICY "clients can view own factures"
  ON factures FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own facture_items"
  ON facture_items FOR SELECT
  USING (facture_id IN (SELECT id FROM factures WHERE client_id = get_client_id()));
```

- [ ] **Step 2: Verify the file looks correct, then commit**

```bash
git add supabase/migrations/004_client_portal.sql
git commit -m "feat(v4): add client portal DB migration (starts_at, booking_tokens, RLS)"
```

> **Note for humans:** Run this migration in Supabase SQL Editor before deploying. The `IF NOT EXISTS` guards make it safe to re-run.

---

## Task 2: TypeScript Types + requireClient Helper

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/api-helpers.ts`

- [ ] **Step 1: Add `BookingToken` interface and `starts_at` to `Appointment` in `src/lib/supabase/types.ts`**

Add after the `Appointment` interface (which ends around line 52):

```ts
// Add starts_at as optional (only present after migration 004)
// Update the existing Appointment interface by adding:
//   starts_at: string | null
// It is a generated column so Supabase returns it as a string.
```

Specifically, add `starts_at?: string | null` to the `Appointment` interface body, and add this new interface after `AppointmentWithRelations`:

```ts
export interface BookingToken {
  id: string
  token: string
  client_id: string
  appointment_id: string
  expires_at: string
  created_at: string
}

export interface AppointmentForClient {
  id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  starts_at: string
  services: Pick<Service, 'name' | 'color'>
  staff: Pick<Staff, 'name'> | null
}
```

Also add `BookingToken` and `AppointmentForClient` to the `Database` Tables block if it exists, or leave as a plain interface — just ensure they are exported.

- [ ] **Step 2: Add `requireClient()` to `src/lib/api-helpers.ts`**

Add after `requireStaff()`:

```ts
/**
 * Verify the caller is an authenticated client.
 * Returns { id, name, phone, email } or null.
 * Client portal API routes import from here.
 */
export async function requireClient(): Promise<{
  id: string
  name: string
  phone: string
  email: string | null
} | null> {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('clients')
    .select('id, name, phone, email')
    .eq('auth_user_id', user.id)
    .single()
  return data ?? null
}
```

- [ ] **Step 3: Type-check**

```bash
cd "C:\Users\yassi\.gemini\antigravity\scratch\brazilian_studio\.worktrees\feature\v1-appointments"
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/api-helpers.ts
git commit -m "feat(v4): add BookingToken type, AppointmentForClient type, requireClient helper"
```

---

## Task 3: Email Templates

**Files:**
- Modify: `src/lib/email-templates.ts`

Context: `cancellationEmail()` already exists and handles client cancellation. We only need to add `bookingConfirmationEmail()`.

- [ ] **Step 1: Add `bookingConfirmationEmail()` to `src/lib/email-templates.ts`**

Add at the end of the file:

```ts
export function bookingConfirmationEmail(data: {
  clientName: string
  serviceName: string
  date: string          // 'YYYY-MM-DD'
  startTime: string     // 'HH:MM:SS'
  staffName: string | null
  token: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const portalUrl = `${siteUrl}/espace-client/acces/${data.token}`
  const formattedDate = new Date(data.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const formattedTime = data.startTime.slice(0, 5) // 'HH:MM'
  const staffLine = data.staffName
    ? `<tr><td style="padding: 8px 0; color: #666;">Avec</td><td><strong>${data.staffName}</strong></td></tr>`
    : `<tr><td style="padding: 8px 0; color: #666;">Avec</td><td><strong>À confirmer</strong></td></tr>`

  return {
    subject: `Votre rendez-vous est enregistré — Brazilian Studio Rabat`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Votre rendez-vous est enregistré !</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Votre rendez-vous a bien été enregistré :</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td><strong>${data.serviceName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Date</td><td><strong>${formattedDate} à ${formattedTime}</strong></td></tr>
          ${staffLine}
        </table>
        <p style="margin-top: 24px;">
          <a href="${portalUrl}" style="background: #B76E79; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Gérer mon rendez-vous
          </a>
        </p>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Ce lien est valable 30 jours. Brazilian Studio Rabat.
        </p>
      </div>
    `,
  }
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
git add src/lib/email-templates.ts
git commit -m "feat(v4): add bookingConfirmationEmail template with portal link"
```

---

## Task 4: Auth API Routes (Magic Link + PKCE Callback)

**Files:**
- Create: `src/app/api/client/auth/magic-link/route.ts`
- Create: `src/app/api/client/auth/callback/route.ts`

**Context:**
- Magic link uses Supabase `signInWithOtp` — Supabase sends the email, we just trigger it
- Callback uses `@supabase/ssr`'s `createServerClient` with cookie handlers (NOT the service_role client) to exchange the PKCE code for a session and write auth cookies
- After session exchange, link `clients.auth_user_id` if not already set

- [ ] **Step 1: Create `src/app/api/client/auth/magic-link/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAnonSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
    }

    const supabase = createAnonSupabaseClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/api/client/auth/callback`,
      },
    })

    // Always return 200 — never reveal whether email exists (prevents enumeration)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/auth/magic-link error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/client/auth/callback/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/espace-client?error=invalid_link`)
  }

  // Build the redirect response first so we can set cookies on it
  const successResponse = NextResponse.redirect(`${origin}/espace-client/dashboard`)
  const errorResponse = (err: string) =>
    NextResponse.redirect(`${origin}/espace-client?error=${err}`)

  // Use @supabase/ssr createServerClient to exchange code + write session cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user || !user.email) {
    // Supabase returns 'invalid_grant' or 'otp_expired' for expired magic links
    const isExpired = error?.message?.toLowerCase().includes('expir') || error?.code === 'otp_expired'
    return errorResponse(isExpired ? 'expired' : 'invalid_link')
  }

  // Link auth user to clients row (use service_role to bypass RLS)
  const admin = createServerSupabaseClient()
  const { data: client } = await admin
    .from('clients')
    .select('id, auth_user_id')
    .eq('email', user.email)
    .single()

  if (!client) {
    return errorResponse('not_found')
  }

  if (!client.auth_user_id) {
    await admin
      .from('clients')
      .update({ auth_user_id: user.id })
      .eq('id', client.id)
  }

  return successResponse
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
git add src/app/api/client/auth/magic-link/route.ts src/app/api/client/auth/callback/route.ts
git commit -m "feat(v4): add magic-link and PKCE callback API routes"
```

---

## Task 5: Client Appointments + Profile API Routes

**Files:**
- Create: `src/app/api/client/appointments/route.ts`
- Create: `src/app/api/client/appointments/[id]/cancel/route.ts`
- Create: `src/app/api/client/profile/route.ts`

**Context:**
- All routes use `requireClient()` from `@/lib/api-helpers`
- Cancellation is idempotent: if already cancelled, return 200 silently
- 24h check: `appointment.starts_at` is a UTC timestamptz stored as string — convert via `new Date(appointment.starts_at).getTime()`
- Send `cancellationEmail()` (already exists in email-templates.ts) fire-and-forget on cancel
- `resend` and `NOTIFY_EMAILS` are imported from `@/lib/resend`

- [ ] **Step 1: Create `src/app/api/client/appointments/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'upcoming' | 'past' | null

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('appointments')
      .select(`
        id, date, start_time, end_time, duration_minutes, status, notes, starts_at,
        services:service_id(name, color),
        staff:staff_id(name)
      `)
      .eq('client_id', client.id)
      .order('starts_at', { ascending: false })

    if (filter === 'upcoming') {
      query = query.gt('starts_at', new Date().toISOString())
    } else if (filter === 'past') {
      query = query.lte('starts_at', new Date().toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [], { status: 200 })
  } catch (err) {
    console.error('GET /api/client/appointments error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/client/appointments/[id]/cancel/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()

    // Fetch appointment and verify ownership
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, client_id, status, starts_at, date, start_time, services:service_id(name)')
      .eq('id', params.id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (appointment.client_id !== client.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Idempotent: already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Status guard
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // 24h guard — starts_at is a UTC timestamptz
    const startsAt = new Date(appointment.starts_at as string).getTime()
    if (startsAt - Date.now() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'too_late_to_cancel' }, { status: 422 })
    }

    // Update status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Insert notification
    await supabase.from('notifications').insert({
      appointment_id: params.id,
      type: 'cancelled',
    })

    // Fire-and-forget emails
    const serviceName = (appointment.services as any)?.name ?? 'Service'
    if (client.email) {
      const emailContent = cancellationEmail({
        clientName: client.name,
        serviceName,
        date: appointment.date,
      })
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: [client.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(err => console.error('Client cancellation email failed:', err))
    }
    if (NOTIFY_EMAILS.length > 0) {
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: NOTIFY_EMAILS,
        subject: `RDV annulé par le client — ${client.name}`,
        html: `<p>Le client <strong>${client.name}</strong> a annulé son RDV pour <strong>${serviceName}</strong> le <strong>${appointment.date}</strong> à <strong>${appointment.start_time}</strong>.</p>`,
      }).catch(err => console.error('Staff cancellation notification failed:', err))
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/appointments/[id]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `src/app/api/client/profile/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

export async function GET() {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json(client, { status: 200 })
  } catch (err) {
    console.error('GET /api/client/profile error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, phone } = body

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'name is required' }, { status: 422 })
      }
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim() === '') {
        return NextResponse.json({ error: 'phone is required' }, { status: 422 })
      }
    }

    const updates: Record<string, string> = {}
    if (name) updates.name = name.trim()
    if (phone) updates.phone = phone.trim()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(client, { status: 200 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', client.id)
      .select('id, name, phone, email')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/client/profile error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add src/app/api/client/appointments/route.ts "src/app/api/client/appointments/[id]/cancel/route.ts" src/app/api/client/profile/route.ts
git commit -m "feat(v4): add client appointments list, cancel, and profile API routes"
```

---

## Task 6: Token API Routes

**Files:**
- Create: `src/app/api/client/tokens/route.ts`
- Create: `src/app/api/client/tokens/[token]/route.ts`
- Create: `src/app/api/client/tokens/[token]/cancel/route.ts`

- [ ] **Step 1: Create `src/app/api/client/tokens/route.ts`** (staff-only: generate/refresh token)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { appointment_id } = await request.json()
    if (!appointment_id) {
      return NextResponse.json({ error: 'appointment_id is required' }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch appointment to get client_id
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, client_id')
      .eq('id', appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 })
    }

    // Upsert token — ON CONFLICT refreshes expiry (must include expires_at in payload so the UPDATE sets it)
    const { data, error } = await supabase
      .from('booking_tokens')
      .upsert(
        {
          client_id: appointment.client_id,
          appointment_id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'appointment_id', ignoreDuplicates: false }
      )
      .select('token')
      .single()

    if (error || !data) throw error ?? new Error('Token upsert returned no data')

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      token: data.token,
      url: `${siteUrl}/espace-client/acces/${data.token}`,
    }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/tokens error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/client/tokens/[token]/route.ts`** (public: resolve token)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: tokenRow, error } = await supabase
      .from('booking_tokens')
      .select('appointment_id, expires_at')
      .eq('token', params.token)
      .single()

    if (error || !tokenRow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 410 })
    }

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id, date, start_time, end_time, status, notes, starts_at,
        clients:client_id(name),
        services:service_id(name, color),
        staff:staff_id(name)
      `)
      .eq('id', tokenRow.appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json(appointment, { status: 200 })
  } catch (err) {
    console.error('GET /api/client/tokens/[token] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `src/app/api/client/tokens/[token]/cancel/route.ts`** (public: cancel via token)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    // Resolve token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('booking_tokens')
      .select('appointment_id, expires_at, client_id')
      .eq('token', params.token)
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 410 })
    }

    // Fetch appointment
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, status, starts_at, date, start_time, services:service_id(name), clients:client_id(name, email)')
      .eq('id', tokenRow.appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Idempotent
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Status guard
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // 24h guard
    const startsAt = new Date(appointment.starts_at as string).getTime()
    if (startsAt - Date.now() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'too_late_to_cancel' }, { status: 422 })
    }

    // Cancel
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', tokenRow.appointment_id)

    if (updateError) throw updateError

    await supabase.from('notifications').insert({
      appointment_id: tokenRow.appointment_id,
      type: 'cancelled',
    })

    // Fire-and-forget emails
    const client = appointment.clients as any
    const serviceName = (appointment.services as any)?.name ?? 'Service'
    if (client?.email) {
      const emailContent = cancellationEmail({
        clientName: client.name,
        serviceName,
        date: appointment.date,
      })
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: [client.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(err => console.error('Token cancel client email failed:', err))
    }
    if (NOTIFY_EMAILS.length > 0) {
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: NOTIFY_EMAILS,
        subject: `RDV annulé via lien — ${client?.name ?? 'Client'}`,
        html: `<p>RDV annulé pour <strong>${serviceName}</strong> le <strong>${appointment.date}</strong>.</p>`,
      }).catch(err => console.error('Token cancel staff email failed:', err))
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/tokens/[token]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add src/app/api/client/tokens/route.ts "src/app/api/client/tokens/[token]/route.ts" "src/app/api/client/tokens/[token]/cancel/route.ts"
git commit -m "feat(v4): add token generation, resolution, and token-based cancel API routes"
```

---

## Task 7: Middleware Update + Booking Flow Update

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/app/api/appointments/route.ts`

**Context for middleware:**
- Currently only protects `/dashboard/:path*`
- Need to also protect `/espace-client/dashboard`, `/espace-client/appointments/*`, `/espace-client/devis`, `/espace-client/factures`, `/espace-client/profile`
- Public paths: `/espace-client` (login), `/espace-client/acces/*` (token view)
- Auth check: same `createServerClient` from `@supabase/ssr` pattern already used — just redirect to `/espace-client` (not `/login`) if no user

**Context for booking flow:**
- After inserting the appointment (step 6 in existing route), generate a booking token
- Then fire-and-forget confirmation email to client

- [ ] **Step 1: Update `src/middleware.ts`**

Replace the entire file with:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const STAFF_PATHS = ['/dashboard']
const CLIENT_PATHS = [
  '/espace-client/dashboard',
  '/espace-client/appointments',
  '/espace-client/devis',
  '/espace-client/factures',
  '/espace-client/profile',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isStaffPath = STAFF_PATHS.some(p => pathname.startsWith(p))
  const isClientPath = CLIENT_PATHS.some(p => pathname.startsWith(p))

  if (!isStaffPath && !isClientPath) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (isStaffPath) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Client path — redirect to espace-client login
    return NextResponse.redirect(new URL('/espace-client', request.url))
  }

  return response
}

export const config = {
  // Only intercept paths that require auth — keep /espace-client (login) and /espace-client/acces/* (public token pages) out of middleware
  matcher: [
    '/dashboard/:path*',
    '/espace-client/dashboard/:path*',
    '/espace-client/appointments/:path*',
    '/espace-client/devis',
    '/espace-client/factures',
    '/espace-client/profile',
  ],
}
```

- [ ] **Step 2: Update `src/app/api/appointments/route.ts`** — add token + confirmation email

Read the file first to find the exact location. After step 7 (insert notification, around line 109–112) and before `return NextResponse.json(...)`, add:

```ts
  // 9. Generate booking token (for client portal private link)
  let bookingToken: string | null = null
  const { data: tokenRow } = await supabase
    .from('booking_tokens')
    .insert({ client_id: clientId, appointment_id: appointment.id })
    .select('token')
    .single()
  if (tokenRow) bookingToken = tokenRow.token

  // 10. Send confirmation email to client (non-blocking)
  // Note: `client`, `service`, `staff`, `date`, `start_time` are already in scope from earlier steps in this route.
  // Do NOT re-fetch them — use the variables already available.
  if (bookingToken && client?.email) {
    const emailContent = bookingConfirmationEmail({
      clientName: client.name,
      serviceName: service?.name ?? 'Service',
      date,
      startTime: start_time,
      staffName: staff?.name ?? null,
      token: bookingToken,
    })
    resend.emails.send({
      from: 'Brazilian Studio <onboarding@resend.dev>',
      to: [client.email],
      subject: emailContent.subject,
      html: emailContent.html,
    }).catch(err => console.error('Booking confirmation email failed:', err))
  }
```

Also add `bookingConfirmationEmail` to the import from `@/lib/email-templates`.

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add src/middleware.ts src/app/api/appointments/route.ts
git commit -m "feat(v4): update middleware for espace-client + add booking token + confirmation email"
```

---

## Task 8: Login Page + Dashboard

**Files:**
- Create: `src/app/espace-client/page.tsx`
- Create: `src/app/espace-client/dashboard/page.tsx`

**Style patterns:** All pages use `'use client'`, same Tailwind classes as existing dashboard pages (`bg-salon-cream`, `text-salon-pink`, `btn-primary`, `input-field`). No new CSS needed.

**Cancel eligibility helper** (used in dashboard and detail page):
```ts
function canCancel(status: string, startsAt: string): boolean {
  if (!['pending', 'confirmed'].includes(status)) return false
  return new Date(startsAt).getTime() - Date.now() > 24 * 60 * 60 * 1000
}
```

- [ ] **Step 1: Create `src/app/espace-client/page.tsx`** (login page)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function EspaceClientLoginPage() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (errorParam === 'not_found') {
      setError("Aucun compte trouvé pour cet email. Contactez le salon.")
    } else if (errorParam === 'expired') {
      // Link expired — show message and keep form visible so client can request a new link
      setError("Ce lien a expiré. Entrez votre email pour en recevoir un nouveau.")
    } else if (errorParam === 'invalid_link') {
      setError("Ce lien est invalide. Demandez un nouveau lien ci-dessous.")
    }
  }, [errorParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/client/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) {
      setSent(true)
    } else {
      setError("Une erreur est survenue. Réessayez.")
    }
  }

  return (
    <div className="min-h-screen bg-salon-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-salon-dark">Brazilian Studio Rabat</h1>
          <p className="text-salon-muted text-sm mt-1">Espace Client</p>
        </div>

        <div className="bg-white rounded-xl border border-salon-rose/20 p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-3xl">📧</div>
              <p className="font-medium text-salon-dark">Lien envoyé !</p>
              <p className="text-sm text-salon-muted">
                Un lien de connexion a été envoyé à <strong>{email}</strong>. Vérifiez vos emails.
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail('') }}
                className="text-sm text-salon-pink hover:underline"
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-medium text-salon-dark mb-1">Connexion</h2>
                <p className="text-xs text-salon-muted">
                  Entrez votre email pour recevoir un lien de connexion.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-salon-muted mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input-field w-full text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Envoi...' : 'Recevoir mon lien de connexion'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/espace-client/dashboard/page.tsx`** (timeline dashboard)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, LogOut } from 'lucide-react'
import type { AppointmentForClient } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé',
  cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
  no_show: 'bg-gray-100 text-gray-400',
}

function canCancel(status: string, startsAt: string): boolean {
  if (!['pending', 'confirmed'].includes(status)) return false
  return new Date(startsAt).getTime() - Date.now() > 24 * 60 * 60 * 1000
}

export default function EspaceClientDashboard() {
  const router = useRouter()
  const [clientName, setClientName] = useState('')
  const [upcoming, setUpcoming] = useState<AppointmentForClient[]>([])
  const [past, setPast] = useState<AppointmentForClient[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const profileRes = await fetch('/api/client/profile')
      if (!profileRes.ok) { router.push('/espace-client'); return }
      const profile = await profileRes.json()
      setClientName(profile.name)

      const [upRes, pastRes] = await Promise.all([
        fetch('/api/client/appointments?filter=upcoming'),
        fetch('/api/client/appointments?filter=past'),
      ])
      if (upRes.ok) setUpcoming(await upRes.json())
      if (pastRes.ok) setPast(await pastRes.json())
      setLoading(false)
    }
    load()
  }, [router])

  async function handleCancel(id: string) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(id)
    setError(null)
    const res = await fetch(`/api/client/appointments/${id}/cancel`, { method: 'POST' })
    if (res.ok) {
      setUpcoming(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as any } : a))
    } else {
      const body = await res.json()
      setError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/espace-client')
  }

  if (loading) return <div className="min-h-screen bg-salon-cream flex items-center justify-center"><p className="text-salon-muted text-sm">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-salon-cream">
      {/* Header */}
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-salon-muted">Brazilian Studio Rabat</p>
          <h1 className="font-semibold text-salon-dark">Bonjour, {clientName} ✦</h1>
        </div>
        <button type="button" onClick={handleLogout} className="flex items-center gap-1 text-sm text-salon-muted hover:text-red-500">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Book CTA */}
        <Link href="/booking" className="btn-primary flex items-center justify-center gap-2 w-full">
          <Plus size={16} /> Prendre un nouveau rendez-vous
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
            {error}
            <button type="button" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="text-xs font-semibold text-salon-muted uppercase tracking-wide mb-2">À venir</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-salon-muted bg-white rounded-xl border border-salon-rose/20 p-4">Aucun rendez-vous à venir.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(a => (
                <Link key={a.id} href={`/espace-client/appointments/${a.id}`}
                  className="block bg-white rounded-xl border border-salon-rose/20 p-4 hover:border-salon-pink/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-salon-dark">{(a.services as any)?.name}</p>
                      <p className="text-sm text-salon-muted">
                        {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' '}· {a.start_time.slice(0, 5)}
                      </p>
                      {(a.staff as any)?.name && (
                        <p className="text-xs text-salon-muted mt-0.5">avec {(a.staff as any).name}</p>
                      )}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[a.status] ?? ''}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                  {canCancel(a.status, a.starts_at) && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); handleCancel(a.id) }}
                      disabled={cancelling === a.id}
                      className="mt-3 text-xs text-red-500 hover:text-red-700"
                    >
                      {cancelling === a.id ? 'Annulation...' : 'Annuler ce rendez-vous'}
                    </button>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-salon-muted uppercase tracking-wide mb-2">Passés</h2>
            <div className="space-y-2">
              {past.slice(0, 5).map(a => (
                <div key={a.id} className="bg-white rounded-xl border border-salon-rose/10 p-4 opacity-60">
                  <p className="font-medium text-salon-dark text-sm">{(a.services as any)?.name}</p>
                  <p className="text-xs text-salon-muted">
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' '}· {a.start_time.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer nav */}
        <nav className="flex justify-center gap-6 text-sm text-salon-muted border-t border-salon-rose/20 pt-4">
          <Link href="/espace-client/factures" className="hover:text-salon-pink">Mes factures</Link>
          <Link href="/espace-client/devis" className="hover:text-salon-pink">Mes devis</Link>
          <Link href="/espace-client/profile" className="hover:text-salon-pink">Mon profil</Link>
        </nav>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add src/app/espace-client/page.tsx src/app/espace-client/dashboard/page.tsx
git commit -m "feat(v4): add espace-client login page and timeline dashboard"
```

---

## Task 9: Appointment Detail + Token View Pages

**Files:**
- Create: `src/app/espace-client/appointments/[id]/page.tsx`
- Create: `src/app/espace-client/acces/[token]/page.tsx`

- [ ] **Step 1: Create `src/app/espace-client/appointments/[id]/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AppointmentForClient } from '@/lib/supabase/types'

function canCancel(status: string, startsAt: string): boolean {
  if (!['pending', 'confirmed'].includes(status)) return false
  return new Date(startsAt).getTime() - Date.now() > 24 * 60 * 60 * 1000
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé',
  cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
  no_show: 'bg-gray-100 text-gray-400',
}

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [appt, setAppt] = useState<AppointmentForClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/appointments')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: AppointmentForClient[]) => {
        const found = data.find(a => a.id === params.id)
        if (!found) router.push('/espace-client/dashboard')
        else setAppt(found)
        setLoading(false)
      })
      .catch(() => router.push('/espace-client/dashboard'))
  }, [params.id, router])

  async function handleCancel() {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(true)
    setError(null)
    const res = await fetch(`/api/client/appointments/${params.id}/cancel`, { method: 'POST' })
    if (res.ok) {
      setAppt(prev => prev ? { ...prev, status: 'cancelled' as any } : prev)
    } else {
      const body = await res.json()
      setError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(false)
  }

  if (loading) return <div className="min-h-screen bg-salon-cream flex items-center justify-center"><p className="text-salon-muted text-sm">Chargement...</p></div>
  if (!appt) return null

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-salon-dark">{(appt.services as any)?.name}</h1>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status] ?? ''}`}>
            {STATUS_LABELS[appt.status] ?? appt.status}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-salon-rose/20 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-salon-muted">Date</span>
            <span className="font-medium">{new Date(appt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-salon-muted">Heure</span>
            <span className="font-medium">{appt.start_time.slice(0, 5)}</span>
          </div>
          {(appt.staff as any)?.name && (
            <div className="flex justify-between">
              <span className="text-salon-muted">Avec</span>
              <span className="font-medium">{(appt.staff as any).name}</span>
            </div>
          )}
          {appt.notes && (
            <div className="flex justify-between">
              <span className="text-salon-muted">Notes</span>
              <span className="text-salon-dark">{appt.notes}</span>
            </div>
          )}
        </div>

        {canCancel(appt.status, appt.starts_at) && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-xl py-2 hover:bg-red-50 transition"
          >
            {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/espace-client/acces/[token]/page.tsx`** (public token view)

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TokenData {
  id: string
  date: string
  start_time: string
  status: string
  notes: string | null
  starts_at: string
  clients: { name: string }
  services: { name: string; color: string }
  staff: { name: string } | null
}

function canCancel(status: string, startsAt: string): boolean {
  if (!['pending', 'confirmed'].includes(status)) return false
  return new Date(startsAt).getTime() - Date.now() > 24 * 60 * 60 * 1000
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé',
  cancelled: 'Annulé', completed: 'Terminé',
}

export default function TokenViewPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<TokenData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'expired' | 'not_found'>('loading')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    fetch(`/api/client/tokens/${params.token}`)
      .then(async res => {
        if (res.ok) { setData(await res.json()); setStatus('ok') }
        else if (res.status === 410) setStatus('expired')
        else setStatus('not_found')
      })
      .catch(() => setStatus('not_found'))
  }, [params.token])

  async function handleCancel() {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(true)
    setCancelError(null)
    const res = await fetch(`/api/client/tokens/${params.token}/cancel`, { method: 'POST' })
    if (res.ok) {
      setCancelled(true)
      setData(prev => prev ? { ...prev, status: 'cancelled' } : prev)
    } else {
      const body = await res.json()
      setCancelError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(false)
  }

  return (
    <div className="min-h-screen bg-salon-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-salon-dark">Brazilian Studio Rabat</h1>
          <p className="text-sm text-salon-muted">Votre rendez-vous</p>
        </div>

        {status === 'loading' && <p className="text-center text-salon-muted text-sm">Chargement...</p>}

        {status === 'expired' && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-6 text-center space-y-3">
            <p className="text-salon-dark font-medium">Ce lien a expiré.</p>
            <p className="text-sm text-salon-muted">Contactez le salon pour obtenir un nouveau lien.</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-6 text-center">
            <p className="text-salon-muted text-sm">Lien invalide.</p>
          </div>
        )}

        {status === 'ok' && data && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-salon-dark">{data.services.name}</h2>
              <span className="text-xs bg-salon-pink/10 text-salon-pink px-2 py-0.5 rounded-full">
                {STATUS_LABELS[cancelled ? 'cancelled' : data.status] ?? data.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-salon-muted">Date</span>
                <span>{new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-salon-muted">Heure</span>
                <span>{data.start_time.slice(0, 5)}</span>
              </div>
              {data.staff?.name && (
                <div className="flex justify-between">
                  <span className="text-salon-muted">Avec</span>
                  <span>{data.staff.name}</span>
                </div>
              )}
            </div>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{cancelError}</p>
            )}

            {!cancelled && canCancel(data.status, data.starts_at) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full text-sm text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition"
              >
                {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
              </button>
            )}

            {cancelled && (
              <p className="text-center text-sm text-green-600">Rendez-vous annulé.</p>
            )}
          </div>
        )}

        <div className="text-center">
          <Link href="/espace-client" className="text-sm text-salon-pink hover:underline">
            Accéder à mon espace client
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add "src/app/espace-client/appointments/[id]/page.tsx" "src/app/espace-client/acces/[token]/page.tsx"
git commit -m "feat(v4): add appointment detail and private token view pages"
```

---

## Task 10: Devis + Factures + Profile Pages

**Files:**
- Create: `src/app/espace-client/devis/page.tsx`
- Create: `src/app/espace-client/factures/page.tsx`
- Create: `src/app/espace-client/profile/page.tsx`

These are read-only list pages — mirror the staff dashboard pages but stripped of all edit/action buttons.

- [ ] **Step 1: Create `src/app/espace-client/devis/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Devis } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
}

export default function ClientDevisPage() {
  const supabase = createClient()
  const [devis, setDevis] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('devis')
      .select('id, number, status, tva_rate, valid_until, created_at, total_ttc')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setDevis(data)
        setLoading(false)
      })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mes devis</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : devis.length === 0 ? (
          <p className="text-salon-muted text-sm">Aucun devis.</p>
        ) : (
          <div className="space-y-2">
            {devis.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-salon-rose/20 p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium text-salon-dark">{d.number}</p>
                  <p className="text-xs text-salon-muted">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  {d.total_ttc != null && (
                    <p className="text-sm font-medium text-salon-dark">{d.total_ttc.toFixed(2)} MAD</p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
                <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                  <Download size={16} className="text-salon-muted hover:text-salon-dark" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/espace-client/factures/page.tsx`**

Same structure as the devis page but for factures. Key differences:
- `status` values: `draft | sent | paid | cancelled`
- Status colors: `paid` → green, `cancelled` → red
- Show `paid_at` when paid
- Links to `/api/factures/[id]/pdf`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Facture } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte', transfer: 'Virement',
}

export default function ClientFacturesPage() {
  const supabase = createClient()
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('factures')
      .select('id, number, status, paid_at, payment_method, created_at, total_ttc')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setFactures(data)
        setLoading(false)
      })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mes factures</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : factures.length === 0 ? (
          <p className="text-salon-muted text-sm">Aucune facture.</p>
        ) : (
          <div className="space-y-2">
            {factures.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-salon-rose/20 p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium text-salon-dark">{f.number}</p>
                  <p className="text-xs text-salon-muted">{new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                  {f.total_ttc != null && (
                    <p className="text-sm font-medium text-salon-dark">{f.total_ttc.toFixed(2)} MAD</p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                    {STATUS_LABELS[f.status] ?? f.status}
                  </span>
                  {f.status === 'paid' && f.paid_at && (
                    <p className="text-xs text-salon-muted mt-0.5">
                      Payée le {new Date(f.paid_at).toLocaleDateString('fr-FR')}
                      {f.payment_method ? ` · ${PAYMENT_LABELS[f.payment_method] ?? f.payment_method}` : ''}
                    </p>
                  )}
                </div>
                <a href={`/api/factures/${f.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                  <Download size={16} className="text-salon-muted hover:text-salon-dark" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/espace-client/profile/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<{ id: string; name: string; phone: string; email: string | null } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data)
          setName(data.name)
          setPhone(data.phone)
        }
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    const res = await fetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    if (res.ok) {
      setSuccess(true)
    } else {
      const body = await res.json()
      setError(body.error || 'Erreur lors de la mise à jour.')
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mon profil</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {!profile ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                Profil mis à jour.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="block text-xs text-salon-muted mb-1">Nom</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Téléphone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Email</label>
              <input
                type="email"
                value={profile.email ?? ''}
                disabled
                className="input-field w-full text-sm bg-gray-50 text-salon-muted cursor-not-allowed"
              />
              <p className="text-xs text-salon-muted mt-1">Pour modifier votre email, contactez le salon.</p>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
git add src/app/espace-client/devis/page.tsx src/app/espace-client/factures/page.tsx src/app/espace-client/profile/page.tsx
git commit -m "feat(v4): add client devis, factures, and profile pages"
```

---

## Task 11: Staff Dashboard "Lien privé" Button + Final Build

**Files:**
- Modify: `src/app/dashboard/calendar/page.tsx` (read the file first)

**Goal:** Add a "Lien privé" icon button to each appointment row/card in the calendar view. Clicking it calls `POST /api/client/tokens` and copies the URL to clipboard with a 2s "Copié !" toast.

- [ ] **Step 1: Read `src/app/dashboard/calendar/page.tsx`** to understand the appointment card structure before editing.

- [ ] **Step 2: Add copy-to-clipboard helper and "Lien privé" button**

Add a `copyPrivateLink` function to the calendar page:

```ts
async function copyPrivateLink(appointmentId: string) {
  const res = await fetch('/api/client/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId }),
  })
  if (res.ok) {
    const { url } = await res.json()
    await navigator.clipboard.writeText(url)
    setCopiedId(appointmentId)
    setTimeout(() => setCopiedId(null), 2000)
  }
}
```

Add state: `const [copiedId, setCopiedId] = useState<string | null>(null)`

Add to the import: `import { Link2 } from 'lucide-react'`

Add button inside each appointment card (next to existing action buttons):

```tsx
<button
  type="button"
  onClick={() => copyPrivateLink(appointment.id)}
  title="Copier le lien privé client"
  className="p-1 text-salon-muted hover:text-salon-pink transition"
>
  {copiedId === appointment.id
    ? <span className="text-xs text-green-600">Copié !</span>
    : <Link2 size={14} />}
</button>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Full Next.js build**

```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds. All new routes appear in the route manifest (both static and dynamic).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/calendar/page.tsx
git commit -m "feat(v4): add private link button to staff calendar + final V4 build verified"
```

---

## Post-Implementation Checklist

After all tasks are complete, run the migration in Supabase SQL Editor:

```
supabase/migrations/004_client_portal.sql
```

Then manually verify:

- [ ] Book an appointment via `/booking` with an email → confirm email received with "Gérer mon rendez-vous" link
- [ ] Click the private link → token view shows appointment, cancel button visible if > 24h away
- [ ] Go to `/espace-client`, enter email → magic link received → click link → redirected to `/espace-client/dashboard`
- [ ] Dashboard shows upcoming appointment with cancel button (if > 24h)
- [ ] Click cancel → appointment shows as "Annulé", cancel button disappears
- [ ] Try cancelling a same-day appointment → error "moins de 24h"
- [ ] `/espace-client/devis` shows client's quotes with PDF download
- [ ] `/espace-client/factures` shows client's invoices with paid status
- [ ] Staff dashboard: click "Lien privé" on an appointment → "Copié !" toast → paste URL → loads token view
