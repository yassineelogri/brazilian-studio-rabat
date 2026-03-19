# Brazilian Studio V1 — Appointments System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete appointment booking and management system — a public booking form at `/booking` and a private dashboard at `/dashboard` — both backed by Supabase with real-time sync.

**Architecture:** Hybrid pattern — reads go directly from browser to Supabase (fast, RLS-protected), writes go through Next.js API routes (business logic: capacity check, email, status transitions). Supabase Realtime keeps the dashboard calendar in sync without page refresh.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS (new pages only — existing CSS Modules untouched), Supabase (PostgreSQL + Auth + Realtime), Resend (email), Vercel (deployment)

**Spec:** `docs/superpowers/specs/2026-03-19-salon-management-design.md`

---

## File Map

### New files to create

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client (singleton)
│   │   ├── server.ts          # Server-side Supabase client (API routes)
│   │   └── types.ts           # TypeScript types matching DB schema
│   ├── resend.ts              # Resend email client instance
│   └── email-templates.ts     # HTML email template functions
│
├── middleware.ts               # Protects /dashboard/* routes
│
├── app/
│   ├── login/
│   │   └── page.tsx           # Staff login form
│   │
│   ├── booking/
│   │   └── page.tsx           # Public multi-step booking form
│   │
│   ├── dashboard/
│   │   ├── layout.tsx         # Dashboard shell: sidebar nav + header
│   │   ├── page.tsx           # Redirect to /dashboard/calendar
│   │   ├── calendar/
│   │   │   └── page.tsx       # Calendar page (day/week toggle + realtime)
│   │   ├── appointments/
│   │   │   └── new/
│   │   │       └── page.tsx   # Manual appointment creation (secretary)
│   │   ├── staff/
│   │   │   └── page.tsx       # Staff list + active toggle
│   │   └── services/
│   │       └── page.tsx       # Services list + edit duration/color
│   │
│   └── api/
│       └── appointments/
│           ├── route.ts                    # POST — create appointment
│           └── [id]/
│               ├── route.ts               # PATCH (fields) + DELETE
│               ├── confirm/
│               │   └── route.ts           # POST — confirm pending
│               └── status/
│                   └── route.ts           # PATCH — status transition
│
└── components/
    ├── booking/
    │   ├── BookingForm.tsx        # Parent: manages step state
    │   ├── ServiceStep.tsx        # Step 1: service selection cards
    │   ├── DateStep.tsx           # Step 2: date picker
    │   ├── TimeStep.tsx           # Step 3: time slot grid
    │   └── ClientInfoStep.tsx     # Step 4: name + phone + email
    │
    └── dashboard/
        ├── CalendarDay.tsx        # Day view: vertical timeline 10-20h
        ├── CalendarWeek.tsx       # Week view: Mon-Sat columns
        ├── AppointmentBlock.tsx   # Single appointment in calendar
        ├── AppointmentSlideOver.tsx # Click → detail panel with actions
        └── PendingBadge.tsx       # Pending count badge in nav
```

### Files to create at project root
```
tailwind.config.ts         # Tailwind with salon color palette
postcss.config.js          # PostCSS (required for Tailwind)
.env.local                 # Supabase + Resend env vars (gitignored)
supabase/
└── migrations/
    └── 001_initial_schema.sql   # All CREATE TABLE + RLS statements
```

### Files to modify
```
package.json               # Add: tailwindcss, @supabase/supabase-js, resend
src/app/globals.css        # Add Tailwind @layer directives at top
src/components/BookingCTA.tsx  # Update "Book" button to link to /booking
next.config.mjs            # No changes needed
```

---

## Task 1: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install all new dependencies at once**

```bash
cd "C:\Users\yassi\.gemini\antigravity\scratch\brazilian_studio"
npm install tailwindcss postcss autoprefixer @supabase/supabase-js resend
npm install -D @types/node
```

Expected: no errors, `package.json` updated with new deps.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@supabase/supabase-js'); require('resend'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add supabase, resend, tailwind dependencies"
```

---

## Task 2: Configure Tailwind CSS

**Files:** `tailwind.config.ts`, `postcss.config.js`, `src/app/globals.css`

- [ ] **Step 1: Initialize Tailwind**

```bash
npx tailwindcss init -p --ts
```

Expected: creates `tailwind.config.ts` and `postcss.config.js`

- [ ] **Step 2: Configure content paths and salon color palette**

Replace the contents of `tailwind.config.ts` with:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        salon: {
          pink:     '#F8D7DA',
          rose:     '#E8B4B8',
          gold:     '#B76E79',
          dark:     '#6B3A3F',
          cream:    '#FDF6F0',
          muted:    '#9E7B7F',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 3: Add Tailwind directives to globals.css**

Add these 3 lines at the very top of `src/app/globals.css` (before any existing CSS):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Verify existing pages are unaffected**

```bash
npm run build
```

Expected: build succeeds. Existing pages (/about, /services, /contact) still use CSS Modules — Tailwind only activates on pages that use Tailwind class names.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/app/globals.css
git commit -m "chore: configure tailwind with salon color palette"
```

---

## Task 3: Create Supabase Project & Environment Variables

**Files:** `.env.local` (create), `.gitignore` (verify)

> **Manual step:** This task requires you to create a Supabase project in the browser.

- [ ] **Step 1: Create Supabase project**

1. Go to https://supabase.com and sign in (or create a free account)
2. Click "New Project"
3. Name it: `brazilian-studio`
4. Choose a strong database password (save it somewhere safe)
5. Select region closest to Morocco: `EU West (Ireland)` or `EU Central (Frankfurt)`
6. Wait ~2 minutes for the project to be ready

- [ ] **Step 2: Get your credentials**

In the Supabase dashboard:
1. Go to **Settings → API**
2. Copy `Project URL` → this is your `SUPABASE_URL`
3. Copy `anon public` key → this is your `SUPABASE_ANON_KEY`
4. Copy `service_role secret` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Create .env.local**

Create the file `C:\Users\yassi\.gemini\antigravity\scratch\brazilian_studio\.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Resend (get from resend.com — free account)
RESEND_API_KEY=re_your_key_here

# Notification emails (your email + secretary email)
NOTIFY_EMAIL_1=your@email.com
NOTIFY_EMAIL_2=secretary@email.com
```

- [ ] **Step 4: Verify .env.local is gitignored**

```bash
cat .gitignore | grep env
```

Expected: `.env.local` or `.env*` appears in the output. If not, add `.env.local` to `.gitignore`.

- [ ] **Step 5: Commit .gitignore update only (NEVER commit .env.local)**

```bash
git add .gitignore
git commit -m "chore: ensure .env.local is gitignored"
```

---

## Task 4: Create Database Schema

**Files:** `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_initial_schema.sql` with the full schema:

```sql
-- =========================================
-- Brazilian Studio — Initial Schema V1
-- =========================================

-- Staff members
CREATE TABLE staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  role         text NOT NULL CHECK (role IN ('worker', 'manager', 'secretary')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Services offered by the salon
CREATE TABLE services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  min_duration integer NOT NULL,
  max_duration integer NOT NULL,
  color        text NOT NULL DEFAULT '#E8B4B8',
  is_active    boolean NOT NULL DEFAULT true
);

-- Clients (guests have no auth_user_id)
CREATE TABLE clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  phone        text NOT NULL UNIQUE,
  email        text,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Appointments (core table)
CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  date             date NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  duration_minutes integer NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes            text,
  created_by       text NOT NULL CHECK (created_by IN ('client','staff')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification log
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('new_booking','confirmed','cancelled')),
  read            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- Row Level Security
-- =========================================

ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an active staff member?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- services: public read, staff write
CREATE POLICY "services_public_read" ON services FOR SELECT USING (true);
CREATE POLICY "services_staff_write" ON services FOR ALL USING (is_staff());

-- staff: public read, staff write
CREATE POLICY "staff_public_read"    ON staff FOR SELECT USING (true);
CREATE POLICY "staff_staff_write"    ON staff FOR ALL USING (is_staff());

-- appointments: staff full access (anon writes via service_role in API routes)
CREATE POLICY "appointments_staff_all" ON appointments FOR ALL USING (is_staff());

-- clients: staff full access
CREATE POLICY "clients_staff_all" ON clients FOR ALL USING (is_staff());

-- notifications: staff full access
CREATE POLICY "notifications_staff_all" ON notifications FOR ALL USING (is_staff());

-- =========================================
-- Seed: Initial services data
-- =========================================

INSERT INTO services (name, description, min_duration, max_duration, color) VALUES
  ('Nail Art',        'Nail design and polish',          60,  180, '#F4A7B9'),
  ('Coiffure',        'Haircut, styling, blow-dry',      15,   45, '#C9A96E'),
  ('Épilation',       'Waxing — body or facial',         20,   60, '#B8D4C8'),
  ('Soin du visage',  'Facial treatment',                45,   90, '#D4B4E8'),
  ('Manucure',        'Manicure + nail care',            30,   60, '#F8B4D4'),
  ('Pédicure',        'Pedicure + foot care',            45,   60, '#B4D4F8');
```

- [ ] **Step 2: Run this SQL in Supabase**

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Paste the entire SQL from the file above
4. Click **Run**

Expected: "Success. No rows returned." — all tables created.

- [ ] **Step 3: Verify tables exist**

In Supabase, go to **Table Editor** — you should see: `staff`, `services`, `clients`, `appointments`, `notifications`

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add initial database schema and RLS policies"
```

---

## Task 5: Supabase Client Utilities + TypeScript Types

**Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`

- [ ] **Step 1: Create browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Singleton browser client — use in React components and client hooks
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

- [ ] **Step 2: Create server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Server-side client with service_role key — bypasses RLS
// NEVER import this in client components
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Anon client for server-side reads (respects RLS)
export function createAnonSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 3: Create TypeScript database types**

Create `src/lib/supabase/types.ts`:

```typescript
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type StaffRole = 'worker' | 'manager' | 'secretary'
export type CreatedBy = 'client' | 'staff'
export type NotificationType = 'new_booking' | 'confirmed' | 'cancelled'

export interface Staff {
  id: string
  name: string
  role: StaffRole
  auth_user_id: string | null
  is_active: boolean
  created_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  min_duration: number
  max_duration: number
  color: string
  is_active: boolean
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  auth_user_id: string | null
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  service_id: string
  staff_id: string | null
  date: string          // YYYY-MM-DD
  start_time: string    // HH:MM:SS
  end_time: string      // HH:MM:SS
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  created_by: CreatedBy
  created_at: string
  updated_at: string
}

// With joined relations (used in dashboard queries)
export interface AppointmentWithRelations extends Appointment {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  services: Pick<Service, 'name' | 'color'>
  staff: Pick<Staff, 'name'> | null
}

export interface Notification {
  id: string
  appointment_id: string
  type: NotificationType
  read: boolean
  created_at: string
}

// Generic Supabase Database type for createClient<Database>()
export type Database = {
  public: {
    Tables: {
      staff:        { Row: Staff;        Insert: Omit<Staff, 'id' | 'created_at'>; Update: Partial<Omit<Staff, 'id'>> }
      services:     { Row: Service;      Insert: Omit<Service, 'id'>;              Update: Partial<Omit<Service, 'id'>> }
      clients:      { Row: Client;       Insert: Omit<Client, 'id' | 'created_at'>; Update: Partial<Omit<Client, 'id'>> }
      appointments: { Row: Appointment;  Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Appointment, 'id'>> }
      notifications:{ Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Omit<Notification, 'id'>> }
    }
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add supabase client utilities and typescript types"
```

---

## Task 6: Resend Email Client + Templates

**Files:** `src/lib/resend.ts`, `src/lib/email-templates.ts`

> **Manual step first:** Go to https://resend.com, create a free account, and get your API key. Add it to `.env.local` as `RESEND_API_KEY`.
> **Domain verification required:** The `from` address in email templates uses `noreply@brazilianstudio.ma`. Resend requires you to verify your sending domain before emails are delivered. In the Resend dashboard → Domains → Add Domain, follow the DNS steps for your domain. Until verified, use `onboarding@resend.dev` as a temporary `from` address for local testing.

- [ ] **Step 1: Create Resend client**

Create `src/lib/resend.ts`:

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const NOTIFY_EMAILS = [
  process.env.NOTIFY_EMAIL_1,
  process.env.NOTIFY_EMAIL_2,
].filter(Boolean) as string[]
```

- [ ] **Step 2: Create email templates**

Create `src/lib/email-templates.ts`:

```typescript
// Email sent to manager/secretary when a new client booking arrives
export function newBookingEmail(data: {
  clientName: string
  clientPhone: string
  serviceName: string
  date: string
  startTime: string
  appointmentId: string
}) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard/calendar`
  return {
    subject: `🌸 Nouvelle réservation — ${data.clientName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Nouvelle demande de réservation</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Client</td><td><strong>${data.clientName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Téléphone</td><td><strong>${data.clientPhone}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td><strong>${data.serviceName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Date</td><td><strong>${data.date}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Heure</td><td><strong>${data.startTime}</strong></td></tr>
        </table>
        <p style="margin-top: 24px;">
          <a href="${dashboardUrl}" style="background: #B76E79; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Voir dans le dashboard
          </a>
        </p>
      </div>
    `,
  }
}

// Email sent to client when their appointment is confirmed
export function confirmationEmail(data: {
  clientName: string
  serviceName: string
  date: string
  startTime: string
}) {
  return {
    subject: `✅ Votre rendez-vous est confirmé — Brazilian Studio`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Votre rendez-vous est confirmé !</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Nous avons bien confirmé votre rendez-vous :</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Service</td><td><strong>${data.serviceName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Date</td><td><strong>${data.date}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Heure</td><td><strong>${data.startTime}</strong></td></tr>
        </table>
        <p>Nous vous attendons avec plaisir. À bientôt ! 🌸</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}

// Email sent to client when their appointment is cancelled
export function cancellationEmail(data: {
  clientName: string
  serviceName: string
  date: string
}) {
  return {
    subject: `Votre rendez-vous a été annulé — Brazilian Studio`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Rendez-vous annulé</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Nous sommes désolés, votre rendez-vous pour <strong>${data.serviceName}</strong> le <strong>${data.date}</strong> a été annulé.</p>
        <p>N'hésitez pas à nous recontacter pour reprogrammer. 🌸</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}
```

- [ ] **Step 3: Add site URL to .env.local**

Add this line to `.env.local`:
```
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
```
(Use `http://localhost:3000` for local development)

- [ ] **Step 4: Commit**

```bash
git add src/lib/resend.ts src/lib/email-templates.ts
git commit -m "feat: add resend email client and templates (fr)"
```

---

## Task 7: Middleware — Route Protection

**Files:** `src/middleware.ts`

- [ ] **Step 1: Install Supabase SSR helper (required for correct cookie handling)**

```bash
npm install @supabase/ssr
```

Supabase JS v2 uses a project-specific cookie name (`sb-<project-ref>-auth-token`), not the generic `sb-access-token`. Using `@supabase/ssr` handles this automatically.

- [ ] **Step 2: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /dashboard/* routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  // Use @supabase/ssr which handles the correct cookie name automatically
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
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

- [ ] **Step 2: Verify middleware runs on correct paths only**

```bash
npm run build
```

Expected: build passes. Check for any TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add dashboard route protection middleware"
```

---

## Task 8: Login Page

**Files:** `src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard/calendar')
  }

  return (
    <div className="min-h-screen bg-salon-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-salon-dark">Brazilian Studio</h1>
          <p className="text-salon-muted mt-1">Espace staff</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-salon-rose/30 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-salon-dark mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold transition"
                placeholder="vous@brazilianstudio.ma"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-salon-dark mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-salon-gold text-white py-2.5 rounded-lg font-medium hover:bg-salon-dark transition disabled:opacity-60"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test manually**

```bash
npm run dev
```

Open http://localhost:3000/login — verify the form renders correctly with pink/rose styling.

- [ ] **Step 3: Create first staff user in Supabase**

1. Go to Supabase dashboard → **Authentication → Users**
2. Click **Add User → Create new user**
3. Enter your email and a password
4. Click **Create User**
5. Then in **SQL Editor**, link this user to the staff table:

```sql
INSERT INTO staff (name, role, auth_user_id, is_active)
SELECT 'Manager', 'manager', id, true
FROM auth.users
WHERE email = 'your@email.com';
```

- [ ] **Step 4: Test login flow**

1. Open http://localhost:3000/login
2. Enter your credentials from step 3
3. Expected: redirected to `/dashboard/calendar` (will 404 for now — that's fine)
4. Try opening http://localhost:3000/dashboard/calendar without logging in → expected: redirected to `/login`

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add staff login page with supabase auth"
```

---

## Task 9: Dashboard Layout + Navigation

**Files:** `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard layout**

Create `src/app/dashboard/layout.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import PendingBadge from '@/components/dashboard/PendingBadge'

const navItems = [
  { href: '/dashboard/calendar',         label: 'Calendrier',    icon: Calendar },
  { href: '/dashboard/appointments/new', label: 'Nouveau RDV',   icon: Plus },
  { href: '/dashboard/staff',            label: 'Staff',         icon: Users },
  { href: '/dashboard/services',         label: 'Prestations',   icon: Scissors },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-salon-cream flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-salon-rose/20 flex flex-col py-6 px-3 fixed inset-y-0 left-0 z-10">
        {/* Salon name */}
        <div className="px-3 mb-8">
          <h1 className="text-base font-semibold text-salon-dark">Brazilian Studio</h1>
          <p className="text-xs text-salon-muted">Dashboard</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-salon-pink text-salon-dark'
                    : 'text-salon-muted hover:bg-salon-cream hover:text-salon-dark'
                }`}
              >
                <Icon size={16} />
                {label}
                {href === '/dashboard/calendar' && <PendingBadge />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-salon-muted hover:text-red-500 hover:bg-red-50 transition"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create dashboard index redirect**

Create `src/app/dashboard/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/dashboard/calendar')
}
```

- [ ] **Step 3: Create PendingBadge component placeholder**

Create `src/components/dashboard/PendingBadge.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function PendingBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setCount(count ?? 0)
    }

    fetchCount()

    // Real-time: re-fetch on any appointment change
    const channel = supabase
      .channel('pending-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-salon-gold text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
      {count > 9 ? '9+' : count}
    </span>
  )
}
```

- [ ] **Step 4: Build and verify layout renders**

```bash
npm run build && npm run dev
```

Log in at http://localhost:3000/login → should see dashboard sidebar.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/ src/components/dashboard/PendingBadge.tsx
git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

## Task 10: API — POST /api/appointments

**Files:** `src/app/api/appointments/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/appointments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { newBookingEmail } from '@/lib/email-templates'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}:00`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { client, service_id, date, start_time, duration_minutes } = body

  // 1. Validate required fields
  if (!client?.name || !client?.phone || !service_id || !date || !start_time || !duration_minutes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 2. Validate date is not Sunday and not in the past
  const appointmentDate = new Date(date)
  if (appointmentDate.getDay() === 0) {
    return NextResponse.json({ error: 'Invalid date: salon is closed on Sundays' }, { status: 400 })
  }
  if (appointmentDate < new Date(new Date().toDateString())) {
    return NextResponse.json({ error: 'Invalid date: cannot book in the past' }, { status: 400 })
  }

  // 3. Compute end_time and validate ≤ 20:00
  const startMinutes = timeToMinutes(start_time)
  const endMinutes = startMinutes + Number(duration_minutes)
  if (endMinutes > 20 * 60) {
    return NextResponse.json({ error: 'Invalid date: appointment would end after 20:00' }, { status: 400 })
  }
  const end_time = minutesToTime(endMinutes)

  const supabase = createServerSupabaseClient()

  // 4. Capacity check — count overlapping appointments (pending + confirmed)
  const { data: overlapping, error: overlapError } = await supabase
    .from('appointments')
    .select('id')
    .eq('date', date)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', end_time)
    .gt('end_time', start_time)

  if (overlapError) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if ((overlapping?.length ?? 0) >= 2) {
    return NextResponse.json({ error: 'No availability at this time' }, { status: 409 })
  }

  // 5. Upsert client by phone (phone = identity key, never overwrite name)
  let clientId: string
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', client.phone)
    .single()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ name: client.name, phone: client.phone, email: client.email ?? null })
      .select('id')
      .single()

    if (clientError || !newClient) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    clientId = newClient.id
  }

  // 6. Insert appointment
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      service_id,
      date,
      start_time: `${start_time}:00`,
      end_time,
      duration_minutes: Number(duration_minutes),
      status: 'pending',
      created_by: 'client',
    })
    .select('id')
    .single()

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 7. Insert notification
  await supabase.from('notifications').insert({
    appointment_id: appointment.id,
    type: 'new_booking',
  })

  // 8. Send email to staff (best-effort — don't fail the request if email fails)
  try {
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', service_id)
      .single()

    const template = newBookingEmail({
      clientName: client.name,
      clientPhone: client.phone,
      serviceName: service?.name ?? 'Unknown',
      date,
      startTime: start_time,
      appointmentId: appointment.id,
    })

    await resend.emails.send({
      from: 'Brazilian Studio <noreply@brazilianstudio.ma>',
      to: NOTIFY_EMAILS,
      subject: template.subject,
      html: template.html,
    })
  } catch {
    // Email failure is non-fatal — appointment is still saved
    console.error('Failed to send notification email')
  }

  return NextResponse.json({ appointment_id: appointment.id }, { status: 201 })
}
```

- [ ] **Step 2: Test the API manually**

With `npm run dev` running, open a terminal and run:

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "client": { "name": "Test Client", "phone": "0612345678" },
    "service_id": "<paste-a-service-id-from-supabase>",
    "date": "2026-03-25",
    "start_time": "10:00",
    "duration_minutes": 60
  }'
```

Expected: `{"appointment_id":"..."}` with status 201.

- [ ] **Step 3: Test validation errors**

```bash
# Should return 409 — book the same slot again
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"client":{"name":"Test 2","phone":"0699999999"},"service_id":"<same-id>","date":"2026-03-25","start_time":"10:00","duration_minutes":60}'
```

Expected: `{"error":"No availability at this time"}` with status 409 (if first booking was confirmed — or book 3 total).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/appointments/route.ts
git commit -m "feat: add POST /api/appointments with capacity check and email"
```

---

## Task 11: API — PATCH, DELETE, Confirm, Status Routes

**Files:** `src/app/api/appointments/[id]/route.ts`, `src/app/api/appointments/[id]/confirm/route.ts`, `src/app/api/appointments/[id]/status/route.ts`

- [ ] **Step 1: Create PATCH/DELETE route**

Create `src/app/api/appointments/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number); return h * 60 + m
}
function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}:00`
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { id } = params
  const body = await request.json()
  const { staff_id, date, start_time, duration_minutes, notes } = body

  // Verify appointment exists
  const { data: existing } = await supabase.from('appointments').select('*').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (staff_id !== undefined)  updates.staff_id = staff_id
  if (notes !== undefined)     updates.notes = notes

  // Time change — re-validate + capacity check
  if (date || start_time || duration_minutes) {
    const newDate = date ?? existing.date
    const newStart = start_time ?? existing.start_time.slice(0, 5)
    const newDuration = duration_minutes ?? existing.duration_minutes
    const endMinutes = timeToMinutes(newStart) + Number(newDuration)

    if (endMinutes > 20 * 60) {
      return NextResponse.json({ error: 'Invalid date: appointment would end after 20:00' }, { status: 400 })
    }
    const newEnd = minutesToTime(endMinutes)

    // Capacity check excluding this appointment
    const { data: overlapping } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', newDate)
      .in('status', ['pending', 'confirmed'])
      .neq('id', id)
      .lt('start_time', newEnd)
      .gt('end_time', `${newStart}:00`)

    if ((overlapping?.length ?? 0) >= 2) {
      return NextResponse.json({ error: 'No availability at this time' }, { status: 409 })
    }

    updates.date = newDate
    updates.start_time = `${newStart}:00`
    updates.end_time = newEnd
    updates.duration_minutes = Number(newDuration)
  }

  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ appointment: data })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('appointments').select('id').eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await supabase.from('appointments').delete().eq('id', params.id)
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Create confirm route**

Create `src/app/api/appointments/[id]/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { confirmationEmail } from '@/lib/email-templates'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, clients(name, email), services(name)')
    .eq('id', params.id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appt.status !== 'pending') return NextResponse.json({ error: 'Appointment is not pending' }, { status: 422 })

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  // Mark related notification as read
  await supabase.from('notifications').update({ read: true }).eq('appointment_id', params.id)

  // Send confirmation email to client (if email exists)
  const client = appt.clients as { name: string; email: string | null }
  if (client?.email) {
    try {
      const template = confirmationEmail({
        clientName: client.name,
        serviceName: (appt.services as { name: string })?.name ?? '',
        date: appt.date,
        startTime: appt.start_time.slice(0, 5),
      })
      await resend.emails.send({
        from: 'Brazilian Studio <noreply@brazilianstudio.ma>',
        to: client.email,
        subject: template.subject,
        html: template.html,
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ appointment: data })
}
```

- [ ] **Step 3: Create status transition route**

Create `src/app/api/appointments/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  cancelled: [],
  completed: [],
  no_show:   [],
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { status: newStatus } = await request.json()

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, clients(name, email), services(name)')
    .eq('id', params.id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ALLOWED_TRANSITIONS[appt.status] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${appt.status} to ${newStatus}` },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  // Send cancellation email if applicable
  const client = appt.clients as { name: string; email: string | null }
  if (newStatus === 'cancelled' && client?.email) {
    try {
      const template = cancellationEmail({
        clientName: client.name,
        serviceName: (appt.services as { name: string })?.name ?? '',
        date: appt.date,
      })
      await resend.emails.send({
        from: 'Brazilian Studio <noreply@brazilianstudio.ma>',
        to: client.email,
        subject: template.subject,
        html: template.html,
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ appointment: data })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/appointments/
git commit -m "feat: add PATCH, DELETE, confirm, and status API routes"
```

---

## Task 12: Public Booking Form

**Files:** `src/app/booking/page.tsx`, `src/components/booking/*.tsx`

- [ ] **Step 1: Create ServiceStep**

Create `src/components/booking/ServiceStep.tsx`:

```typescript
import type { Service } from '@/lib/supabase/types'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export default function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez un service</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`text-left p-4 rounded-xl border-2 transition ${
              selectedId === service.id
                ? 'border-salon-gold bg-salon-pink'
                : 'border-gray-100 hover:border-salon-rose bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: service.color }}
              />
              <span className="font-medium text-salon-dark">{service.name}</span>
            </div>
            <p className="text-xs text-salon-muted mt-1 ml-6">
              {service.min_duration}–{service.max_duration} min
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create DateStep**

Create `src/components/booking/DateStep.tsx`:

```typescript
interface Props {
  selectedDate: string
  onChange: (date: string) => void
}

export default function DateStep({ selectedDate, onChange }: Props) {
  const today = new Date().toISOString().split('T')[0]

  // Determine if a date string is a Sunday
  function isSunday(dateStr: string) {
    return new Date(dateStr).getDay() === 0
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez une date</h2>
      <p className="text-sm text-salon-muted mb-4">
        Ouvert du lundi au samedi · 10h00–20h00
      </p>
      <input
        type="date"
        value={selectedDate}
        min={today}
        onChange={e => {
          if (!isSunday(e.target.value)) onChange(e.target.value)
        }}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold text-salon-dark"
      />
      {selectedDate && isSunday(selectedDate) && (
        <p className="text-sm text-red-500 mt-2">Le salon est fermé le dimanche.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create TimeStep**

Create `src/components/booking/TimeStep.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Props {
  date: string
  durationMinutes: number
  selectedTime: string
  onSelect: (time: string) => void
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number); return h * 60 + m
}

function minutesToDisplay(m: number) {
  return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
}

export default function TimeStep({ date, durationMinutes, selectedTime, onSelect }: Props) {
  const [bookedSlots, setBookedSlots] = useState<{ start_time: string; end_time: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBooked() {
      setLoading(true)
      const { data } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('date', date)
        .in('status', ['pending', 'confirmed'])
      setBookedSlots(data ?? [])
      setLoading(false)
    }
    if (date) fetchBooked()
  }, [date])

  // Generate candidate slots: 10:00 to (20:00 - duration)
  const slots: string[] = []
  const lastStart = 20 * 60 - durationMinutes
  for (let m = 10 * 60; m <= lastStart; m += 30) {
    slots.push(minutesToDisplay(m))
  }

  function isAvailable(slotStart: string) {
    const slotStartM = timeToMinutes(slotStart)
    const slotEndM = slotStartM + durationMinutes
    const overlapCount = bookedSlots.filter(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return bStart < slotEndM && bEnd > slotStartM
    }).length
    return overlapCount < 2
  }

  if (loading) {
    return <p className="text-salon-muted">Chargement des disponibilités...</p>
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez un horaire</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map(slot => {
          const available = isAvailable(slot)
          return (
            <button
              key={slot}
              disabled={!available}
              onClick={() => onSelect(slot)}
              className={`py-2.5 rounded-lg text-sm font-medium transition ${
                selectedTime === slot
                  ? 'bg-salon-gold text-white'
                  : available
                    ? 'bg-white border border-gray-200 text-salon-dark hover:border-salon-gold'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
              }`}
            >
              {slot}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ClientInfoStep**

Create `src/components/booking/ClientInfoStep.tsx`:

```typescript
interface ClientInfo {
  name: string
  phone: string
  email: string
}

interface Props {
  info: ClientInfo
  onChange: (info: ClientInfo) => void
}

export default function ClientInfoStep({ info, onChange }: Props) {
  function update(field: keyof ClientInfo, value: string) {
    onChange({ ...info, [field]: value })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Vos coordonnées</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Nom complet *</label>
          <input
            type="text"
            value={info.name}
            onChange={e => update('name', e.target.value)}
            required
            placeholder="Votre nom"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Téléphone *</label>
          <input
            type="tel"
            value={info.phone}
            onChange={e => update('phone', e.target.value)}
            required
            placeholder="06 XX XX XX XX"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">
            Email <span className="text-salon-muted font-normal">(optionnel — pour la confirmation)</span>
          </label>
          <input
            type="email"
            value={info.email}
            onChange={e => update('email', e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create BookingForm orchestrator**

Create `src/components/booking/BookingForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Service } from '@/lib/supabase/types'
import ServiceStep from './ServiceStep'
import DateStep from './DateStep'
import TimeStep from './TimeStep'
import ClientInfoStep from './ClientInfoStep'

type Step = 'service' | 'date' | 'time' | 'info' | 'success' | 'error'

interface Props {
  services: Service[]
}

export default function BookingForm({ services }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' })
  const [conflictError, setConflictError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stepNumber = { service: 1, date: 2, time: 3, info: 4, success: 4, error: 4 }[step]

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.phone) return
    setSubmitting(true)
    setConflictError(false)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { name: clientInfo.name, phone: clientInfo.phone, email: clientInfo.email || undefined },
        service_id: selectedService.id,
        date: selectedDate,
        start_time: selectedTime,
        duration_minutes: selectedService.min_duration,
      }),
    })

    setSubmitting(false)

    if (res.status === 409) {
      setConflictError(true)
      setStep('time')
      return
    }

    if (!res.ok) {
      setStep('error')
      return
    }

    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">🌸</div>
        <h2 className="text-2xl font-semibold text-salon-dark mb-2">Merci !</h2>
        <p className="text-salon-muted max-w-sm mx-auto">
          Nous avons bien reçu votre demande. Nous vous confirmerons votre rendez-vous sous peu.
        </p>
        <button
          onClick={() => { setStep('service'); setSelectedService(null); setSelectedDate(''); setSelectedTime('') }}
          className="mt-6 text-salon-gold underline text-sm"
        >
          Prendre un autre rendez-vous
        </button>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">Une erreur est survenue. Veuillez réessayer.</p>
        <button onClick={() => setStep('info')} className="text-salon-gold underline text-sm">
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              n <= stepNumber ? 'bg-salon-gold text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {n}
            </div>
            {n < 4 && <div className={`flex-1 h-px w-8 ${n < stepNumber ? 'bg-salon-gold' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-salon-rose/20 p-6">
        {step === 'service' && (
          <ServiceStep
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={s => { setSelectedService(s); setStep('date') }}
          />
        )}
        {step === 'date' && (
          <>
            <DateStep selectedDate={selectedDate} onChange={setSelectedDate} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('service')} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-salon-gold transition">
                Retour
              </button>
              <button
                onClick={() => setStep('time')}
                disabled={!selectedDate}
                className="flex-1 py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-salon-dark transition"
              >
                Continuer
              </button>
            </div>
          </>
        )}
        {step === 'time' && (
          <>
            {conflictError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">
                Ce créneau n'est plus disponible. Veuillez en choisir un autre.
              </p>
            )}
            <TimeStep
              date={selectedDate}
              durationMinutes={selectedService?.min_duration ?? 60}
              selectedTime={selectedTime}
              onSelect={t => { setSelectedTime(t); setStep('info') }}
            />
            <button onClick={() => setStep('date')} className="mt-4 text-salon-muted text-sm underline">
              Retour
            </button>
          </>
        )}
        {step === 'info' && (
          <>
            <ClientInfoStep info={clientInfo} onChange={setClientInfo} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('time')} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-salon-gold transition">
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !clientInfo.name || !clientInfo.phone}
                className="flex-1 py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-salon-dark transition"
              >
                {submitting ? 'Envoi...' : 'Confirmer le rendez-vous'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create the booking page**

Create `src/app/booking/page.tsx`:

```typescript
import { createAnonSupabaseClient } from '@/lib/supabase/server'
import BookingForm from '@/components/booking/BookingForm'

export const revalidate = 3600 // Re-fetch services every hour

export default async function BookingPage() {
  const supabase = createAnonSupabaseClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-salon-cream py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold text-salon-dark">Prendre rendez-vous</h1>
        <p className="text-salon-muted mt-2">Brazilian Studio Rabat · Lun–Sam 10h00–20h00</p>
      </div>
      <BookingForm services={services ?? []} />
    </div>
  )
}
```

- [ ] **Step 7: Update BookingCTA to link to /booking**

In `src/components/BookingCTA.tsx`, find the button/link that says "Book" or "Réserver" and update it to:

```typescript
import Link from 'next/link'
// Replace the button with:
<Link href="/booking">Prendre rendez-vous</Link>
```

- [ ] **Step 8: Test the full booking flow manually**

```bash
npm run dev
```

1. Open http://localhost:3000/booking
2. Select a service → next
3. Select a date → next
4. Select a time slot → next
5. Enter name + phone → submit
6. Expected: success screen "Merci!"
7. Check Supabase dashboard → `appointments` table has a new row with status `pending`
8. Check `notifications` table has a `new_booking` entry

- [ ] **Step 9: Commit**

```bash
git add src/app/booking/ src/components/booking/ src/components/BookingCTA.tsx
git commit -m "feat: add public multi-step booking form"
```

---

## Task 13: Dashboard Calendar Components

**Files:** `src/components/dashboard/AppointmentBlock.tsx`, `src/components/dashboard/CalendarDay.tsx`, `src/components/dashboard/CalendarWeek.tsx`

- [ ] **Step 1: Create AppointmentBlock**

Create `src/components/dashboard/AppointmentBlock.tsx`:

```typescript
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations
  onClick: (a: AppointmentWithRelations) => void
  style?: React.CSSProperties
}

const STATUS_STYLES = {
  pending:   'border-l-4 border-amber-400 bg-amber-50',
  confirmed: 'border-l-4 border-green-400 bg-green-50',
  cancelled: 'border-l-4 border-gray-300 bg-gray-50 opacity-60',
  completed: 'border-l-4 border-blue-300 bg-blue-50',
  no_show:   'border-l-4 border-red-300 bg-red-50',
}

export default function AppointmentBlock({ appointment, onClick, style }: Props) {
  const statusStyle = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.pending

  return (
    <button
      onClick={() => onClick(appointment)}
      style={{ backgroundColor: appointment.services?.color + '33', borderColor: appointment.services?.color, ...style }}
      className={`w-full text-left p-2 rounded-md border-l-4 text-xs overflow-hidden cursor-pointer hover:opacity-90 transition ${statusStyle}`}
    >
      <p className="font-semibold text-salon-dark truncate">{appointment.clients?.name}</p>
      <p className="text-salon-muted truncate">{appointment.services?.name}</p>
      <p className="text-salon-muted">
        {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
      </p>
      {appointment.status === 'pending' && (
        <span className="inline-block mt-1 text-amber-600 font-medium">⏳ En attente</span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create CalendarDay**

Create `src/components/dashboard/CalendarDay.tsx`:

```typescript
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  date: string // YYYY-MM-DD
  appointments: AppointmentWithRelations[]
  onAppointmentClick: (a: AppointmentWithRelations) => void
}

const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 10
const END_HOUR = 20

export default function CalendarDay({ date, appointments, onAppointmentClick }: Props) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  function getTopOffset(time: string) {
    const [h, m] = time.split(':').map(Number)
    return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT
  }

  function getHeight(startTime: string, endTime: string) {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const durationH = (eh + em / 60) - (sh + sm / 60)
    return durationH * HOUR_HEIGHT
  }

  const dayAppts = appointments.filter(a => a.date === date)

  return (
    <div className="flex">
      {/* Time labels */}
      <div className="w-14 flex-shrink-0">
        {hours.map(h => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start pt-1">
            <span className="text-xs text-gray-400">{h}:00</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 relative border-l border-gray-100">
        {/* Hour lines */}
        {hours.map(h => (
          <div
            key={h}
            style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            className="absolute left-0 right-0 border-t border-gray-100"
          />
        ))}

        {/* Appointment blocks */}
        {dayAppts.map(appt => (
          <div
            key={appt.id}
            style={{
              position: 'absolute',
              top: getTopOffset(appt.start_time),
              height: Math.max(getHeight(appt.start_time, appt.end_time) - 4, 28),
              left: 4,
              right: 4,
            }}
          >
            <AppointmentBlock appointment={appt} onClick={onAppointmentClick} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CalendarWeek**

Create `src/components/dashboard/CalendarWeek.tsx`:

```typescript
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  weekStart: Date // Monday of the week
  appointments: AppointmentWithRelations[]
  onAppointmentClick: (a: AppointmentWithRelations) => void
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function CalendarWeek({ weekStart, appointments, onAppointmentClick }: Props) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid grid-cols-6 gap-2">
      {days.map((day, i) => {
        const dateStr = formatDate(day)
        const dayAppts = appointments.filter(a => a.date === dateStr)
        const isToday = dateStr === formatDate(new Date())

        return (
          <div key={dateStr}>
            {/* Day header */}
            <div className={`text-center py-2 rounded-lg mb-2 ${isToday ? 'bg-salon-gold text-white' : 'bg-gray-50'}`}>
              <p className="text-xs font-medium">{DAY_LABELS[i]}</p>
              <p className={`text-lg font-semibold ${isToday ? 'text-white' : 'text-salon-dark'}`}>
                {day.getDate()}
              </p>
            </div>

            {/* Appointments */}
            <div className="space-y-1 min-h-32">
              {dayAppts.length === 0 && (
                <p className="text-xs text-gray-300 text-center pt-4">—</p>
              )}
              {dayAppts.map(appt => (
                <AppointmentBlock key={appt.id} appointment={appt} onClick={onAppointmentClick} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/AppointmentBlock.tsx src/components/dashboard/CalendarDay.tsx src/components/dashboard/CalendarWeek.tsx
git commit -m "feat: add calendar day/week view components"
```

---

## Task 14: AppointmentSlideOver Panel

**Files:** `src/components/dashboard/AppointmentSlideOver.tsx`

- [ ] **Step 1: Create the slide-over panel**

Create `src/components/dashboard/AppointmentSlideOver.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { X, Phone } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations | null
  onClose: () => void
  onAction: () => void // called after any action to refresh data
}

const STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ En attente',
  confirmed: '✅ Confirmé',
  cancelled: '❌ Annulé',
  completed: '✔ Terminé',
  no_show:   '🚫 No-show',
}

export default function AppointmentSlideOver({ appointment, onClose, onAction }: Props) {
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  async function confirm() {
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}/confirm`, { method: 'POST' })
    setLoading(false)
    onAction()
    onClose()
  }

  async function changeStatus(status: string) {
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    onAction()
    onClose()
  }

  async function deleteAppt() {
    if (!confirm('Supprimer ce rendez-vous ?')) return
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}`, { method: 'DELETE' })
    setLoading(false)
    onAction()
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-salon-dark">Rendez-vous</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Status badge */}
          <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-salon-pink text-salon-dark">
            {STATUS_LABELS[appointment.status]}
          </span>

          {/* Client */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Client</p>
            <p className="font-medium text-salon-dark">{appointment.clients?.name}</p>
            <a
              href={`tel:${appointment.clients?.phone}`}
              className="flex items-center gap-1 text-sm text-salon-gold mt-1 hover:underline"
            >
              <Phone size={13} /> {appointment.clients?.phone}
            </a>
          </div>

          {/* Service */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Service</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: appointment.services?.color }} />
              <p className="font-medium text-salon-dark">{appointment.services?.name}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Date & Heure</p>
            <p className="font-medium text-salon-dark">{appointment.date}</p>
            <p className="text-sm text-salon-muted">
              {appointment.start_time.slice(0, 5)} → {appointment.end_time.slice(0, 5)}
              {' '}({appointment.duration_minutes} min)
            </p>
          </div>

          {/* Staff */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Staff assigné</p>
            <p className="text-salon-dark">{appointment.staff?.name ?? <span className="text-gray-400 italic">Non assigné</span>}</p>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-salon-dark bg-salon-cream p-3 rounded-lg">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {appointment.status === 'pending' && (
            <>
              <button
                onClick={confirm}
                disabled={loading}
                className="w-full py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium hover:bg-salon-dark transition disabled:opacity-60"
              >
                ✅ Confirmer
              </button>
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={loading}
                className="w-full py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-60"
              >
                Annuler
              </button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <>
              <button
                onClick={() => changeStatus('completed')}
                disabled={loading}
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-60"
              >
                ✔ Marquer terminé
              </button>
              <button
                onClick={() => changeStatus('no_show')}
                disabled={loading}
                className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                No-show
              </button>
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={loading}
                className="w-full py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-60"
              >
                Annuler
              </button>
            </>
          )}
          <button
            onClick={deleteAppt}
            disabled={loading}
            className="w-full py-2 text-xs text-gray-300 hover:text-red-400 transition"
          >
            Supprimer
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/AppointmentSlideOver.tsx
git commit -m "feat: add appointment slide-over detail panel"
```

---

## Task 15: Dashboard Calendar Page + Real-time

**Files:** `src/app/dashboard/calendar/page.tsx`

- [ ] **Step 1: Create calendar page**

Create `src/app/dashboard/calendar/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import CalendarDay from '@/components/dashboard/CalendarDay'
import CalendarWeek from '@/components/dashboard/CalendarWeek'
import AppointmentSlideOver from '@/components/dashboard/AppointmentSlideOver'

type View = 'day' | 'week'

function getMondayOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null)
  const [loading, setLoading] = useState(true)

  const weekStart = getMondayOfWeek(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 5)
  const rangeStart = view === 'day' ? formatDate(currentDate) : formatDate(weekStart)
  const rangeEnd   = view === 'day' ? formatDate(currentDate) : formatDate(weekEnd)

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
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

    setAppointments((data as AppointmentWithRelations[]) ?? [])
    setLoading(false)
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    fetchAppointments()

    // Real-time subscription
    const channel = supabase
      .channel('calendar-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAppointments])

  function navigate(direction: 1 | -1) {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + direction)
    else d.setDate(d.getDate() + direction * 7)
    setCurrentDate(d)
  }

  const headerLabel = view === 'day'
    ? currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-salon-dark capitalize">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 text-xs text-salon-gold underline"
          >
            Aujourd'hui
          </button>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['day', 'week'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === v ? 'bg-white shadow-sm text-salon-dark' : 'text-gray-400'
              }`}
            >
              {v === 'day' ? 'Jour' : 'Semaine'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : view === 'day' ? (
        <CalendarDay
          date={formatDate(currentDate)}
          appointments={appointments}
          onAppointmentClick={setSelected}
        />
      ) : (
        <CalendarWeek
          weekStart={weekStart}
          appointments={appointments}
          onAppointmentClick={setSelected}
        />
      )}

      {/* Slide-over */}
      <AppointmentSlideOver
        appointment={selected}
        onClose={() => setSelected(null)}
        onAction={fetchAppointments}
      />
    </div>
  )
}
```

- [ ] **Step 2: Test calendar with real data**

```bash
npm run dev
```

1. Log in → go to http://localhost:3000/dashboard/calendar
2. Should see the calendar with any appointments you created
3. Click an appointment → slide-over panel appears with Confirm/Cancel buttons
4. Click Confirm → appointment status changes, calendar re-renders
5. Open a second browser tab and book an appointment at http://localhost:3000/booking → calendar should update **without refreshing** (real-time test)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/calendar/page.tsx
git commit -m "feat: add dashboard calendar page with real-time sync"
```

---

## Task 16: Manual Appointment Creation + Staff/Services Pages

**Files:** `src/app/dashboard/appointments/new/page.tsx`, `src/app/dashboard/staff/page.tsx`, `src/app/dashboard/services/page.tsx`

- [ ] **Step 1: Create manual appointment page**

Create `src/app/dashboard/appointments/new/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Service, Staff } from '@/lib/supabase/types'

export default function NewAppointmentPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    clientName: '', clientPhone: '',
    serviceId: '', staffId: '',
    date: '', startTime: '',
    durationMinutes: 60, notes: '',
  })

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true).then(({ data }) => setServices(data ?? []))
    supabase.from('staff').select('*').eq('is_active', true).then(({ data }) => setStaff(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { name: form.clientName, phone: form.clientPhone },
        service_id: form.serviceId,
        date: form.date,
        start_time: form.startTime,
        duration_minutes: form.durationMinutes,
      }),
    })

    if (res.ok) {
      const { appointment_id } = await res.json()
      // Auto-confirm staff-created appointments, assign staff, and save notes
      const patchBody: Record<string, unknown> = {}
      if (form.staffId) patchBody.staff_id = form.staffId
      if (form.notes)   patchBody.notes = form.notes
      if (Object.keys(patchBody).length > 0) {
        await fetch(`/api/appointments/${appointment_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
      }
      await fetch(`/api/appointments/${appointment_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      router.push('/dashboard/calendar')
    } else {
      const { error } = await res.json()
      alert(error)
    }
    setLoading(false)
  }

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-salon-dark mb-1">{label}</label>
      {children}
    </div>
  )

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 text-sm"

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Nouveau rendez-vous</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-salon-rose/20 p-6 space-y-4">
        {field('Nom du client *', <input className={inputClass} required value={form.clientName} onChange={e => setForm(f => ({...f, clientName: e.target.value}))} />)}
        {field('Téléphone *', <input className={inputClass} required type="tel" value={form.clientPhone} onChange={e => setForm(f => ({...f, clientPhone: e.target.value}))} />)}

        {field('Service *', (
          <select className={inputClass} required value={form.serviceId} onChange={e => {
            const s = services.find(s => s.id === e.target.value)
            setForm(f => ({...f, serviceId: e.target.value, durationMinutes: s?.min_duration ?? 60}))
          }}>
            <option value="">Choisir un service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.min_duration}–{s.max_duration} min)</option>)}
          </select>
        ))}

        {field('Staff assigné', (
          <select className={inputClass} value={form.staffId} onChange={e => setForm(f => ({...f, staffId: e.target.value}))}>
            <option value="">À assigner plus tard</option>
            {staff.filter(s => s.role !== 'secretary').map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        ))}

        {field('Date *', <input className={inputClass} required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />)}
        {field('Heure *', <input className={inputClass} required type="time" min="10:00" max="20:00" step="1800" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} />)}
        {field('Durée (minutes)', <input className={inputClass} required type="number" min="15" max="300" value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: Number(e.target.value)}))} />)}
        {field('Notes internes', <textarea className={inputClass} rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />)}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-salon-gold text-white rounded-lg font-medium hover:bg-salon-dark transition disabled:opacity-60"
        >
          {loading ? 'Enregistrement...' : 'Créer le rendez-vous'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create staff management page**

Create `src/app/dashboard/staff/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Staff } from '@/lib/supabase/types'

const ROLE_LABELS: Record<string, string> = {
  worker: 'Employée', manager: 'Gérante', secretary: 'Secrétaire'
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])

  useEffect(() => {
    supabase.from('staff').select('*').order('name').then(({ data }) => setStaff(data ?? []))
  }, [])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('staff').update({ is_active: !current }).eq('id', id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Staff</h1>
      <div className="bg-white rounded-2xl border border-salon-rose/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-salon-cream text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Nom</th>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Rôle</th>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-salon-dark">{s.name}</td>
                <td className="px-4 py-3 text-sm text-salon-muted">{ROLE_LABELS[s.role] ?? s.role}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                      s.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create services management page**

Create `src/app/dashboard/services/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Service } from '@/lib/supabase/types'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('services').select('*').order('name').then(({ data }) => setServices(data ?? []))
  }, [])

  async function updateService(id: string, updates: Partial<Service>) {
    await supabase.from('services').update(updates).eq('id', id)
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    setEditing(null)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Prestations</h1>
      <div className="space-y-3">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-xl border border-salon-rose/20 p-4">
            {editing === service.id ? (
              <EditServiceForm service={service} onSave={updates => updateService(service.id, updates)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: service.color }} />
                  <div>
                    <p className="font-medium text-salon-dark">{service.name}</p>
                    <p className="text-xs text-salon-muted">{service.min_duration}–{service.max_duration} min</p>
                  </div>
                </div>
                <button onClick={() => setEditing(service.id)} className="text-xs text-salon-gold underline">
                  Modifier
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditServiceForm({ service, onSave, onCancel }: {
  service: Service
  onSave: (updates: Partial<Service>) => void
  onCancel: () => void
}) {
  const [min, setMin] = useState(service.min_duration)
  const [max, setMax] = useState(service.max_duration)
  const [color, setColor] = useState(service.color)

  return (
    <div className="space-y-3">
      <p className="font-medium text-salon-dark">{service.name}</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-salon-muted block mb-1">Durée min (min)</label>
          <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-salon-muted block mb-1">Durée max (min)</label>
          <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-salon-muted block mb-1">Couleur</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-12 rounded-lg cursor-pointer border border-gray-200" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ min_duration: min, max_duration: max, color })} className="px-4 py-2 bg-salon-gold text-white rounded-lg text-sm font-medium hover:bg-salon-dark transition">
          Sauvegarder
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-gray-300 transition">
          Annuler
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test all dashboard pages**

```bash
npm run dev
```

Visit and verify each page works:
- http://localhost:3000/dashboard/appointments/new → create a manual appointment
- http://localhost:3000/dashboard/staff → see staff list, toggle active
- http://localhost:3000/dashboard/services → see services, edit duration/color

- [ ] **Step 5: Commit all**

```bash
git add src/app/dashboard/appointments/ src/app/dashboard/staff/ src/app/dashboard/services/
git commit -m "feat: add manual appointment creation, staff, and services pages"
```

---

## Task 17: Seed Staff Data + Production Deploy

**Files:** Supabase SQL Editor (manual), Vercel dashboard (manual)

- [ ] **Step 1: Add all staff members in Supabase**

In Supabase SQL Editor:

```sql
-- Add staff (auth_user_id filled after you create accounts in Auth)
INSERT INTO staff (name, role, is_active) VALUES
  ('Secrétaire', 'secretary', true),
  ('Employée 1', 'worker',    true),
  ('Employée 2', 'worker',    true);
-- Note: manager record was already added in Task 8 Step 3
```

- [ ] **Step 2: Create Supabase Auth accounts for each staff member**

In Supabase → Authentication → Users → Add User for each staff member, then link them:

```sql
-- Run for each staff member after creating their auth account:
UPDATE staff SET auth_user_id = (
  SELECT id FROM auth.users WHERE email = 'secretary@email.com'
) WHERE name = 'Secrétaire';
```

- [ ] **Step 3: Add environment variables to Vercel**

In your Vercel project dashboard → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NOTIFY_EMAIL_1`
- `NOTIFY_EMAIL_2`
- `NEXT_PUBLIC_SITE_URL` (your Vercel domain)

- [ ] **Step 4: Deploy to Vercel**

```bash
git push origin main
```

Vercel auto-deploys from the main branch. Wait ~2 minutes, then visit your Vercel URL.

- [ ] **Step 5: Smoke test production**

1. Visit `https://your-domain.vercel.app/booking` — booking form loads
2. Submit a test booking → check Supabase for new appointment
3. Visit `https://your-domain.vercel.app/login` — log in with manager credentials
4. Visit `/dashboard/calendar` — see the appointment, confirm it
5. Verify confirmation email is received

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: V1 complete — appointments, booking form, dashboard, real-time sync"
git tag v1.0.0
git push origin main --tags
```

---

## Done ✓

V1 is complete when:
- [ ] Clients can book from `/booking` (guest, no account needed)
- [ ] New bookings appear instantly on `/dashboard/calendar` (real-time)
- [ ] Staff receive email notification on each new booking
- [ ] Secretary can confirm/cancel from the slide-over panel
- [ ] Confirmed appointment triggers email to client (if email provided)
- [ ] Staff can create manual appointments from `/dashboard/appointments/new`
- [ ] Staff list and services are manageable from dashboard
- [ ] Dashboard is accessible only after login
- [ ] Deployed and working on Vercel

**Next:** V2 — Products & Inventory (`docs/superpowers/specs/` — new design session)
