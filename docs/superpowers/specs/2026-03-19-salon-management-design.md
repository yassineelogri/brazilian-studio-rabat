# Brazilian Studio — Salon Management System Design

**Date:** 2026-03-19
**Scope:** V1 — Appointment management only
**Status:** Approved

---

## 1. Overview

A full-stack salon management system for **Brazilian Studio Rabat**, built on top of an existing Next.js 14 website deployed on Vercel. The system enables clients to book appointments from the public website and staff to manage all appointments from a private dashboard — both synchronized in real time via Supabase.

**Business context:**
- Salon hours: Monday–Saturday, 10:00–20:00. Sunday closed.
- Staff: 2 active workers, 1 manager (occasional service provider), 1 secretary (admin only — no service bookings)
- Booking capacity: maximum 2 simultaneous appointments at any given time (2 workers; manager counted only when explicitly assigned)
- Services have flexible durations (e.g. nail art: 2–3h, coiffure: 15–45min)
- Clients pick service + time only; staff is assigned internally by secretary/manager after booking

---

## 2. Architecture

**Approach: Hybrid**

- **Reads**: Browser → Supabase client directly (fast, Row Level Security enforced)
- **Writes**: Browser → Next.js API routes → Supabase (business logic: capacity check, email notification, status transitions)
- **Real-time**: Supabase Realtime subscriptions on the `appointments` table → dashboard calendar updates instantly
- **Database**: Supabase (hosted PostgreSQL, free tier)
- **Auth**: Supabase Auth (email + password for staff; guest booking requires no auth)
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS (co-exists with existing CSS Modules — new pages use Tailwind, existing pages keep their CSS Modules unchanged)
- **Email**: Resend (free tier — 3,000 emails/month)
- **Deployment**: Single Vercel project (public site + dashboard in one app)

---

## 3. Database Schema

### `staff`
```sql
CREATE TABLE staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  role         text NOT NULL CHECK (role IN ('worker', 'manager', 'secretary')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### `services`
```sql
CREATE TABLE services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  min_duration integer NOT NULL, -- minutes
  max_duration integer NOT NULL, -- minutes
  color        text NOT NULL DEFAULT '#E8B4B8', -- hex color for calendar
  is_active    boolean NOT NULL DEFAULT true
);
```

### `clients`
```sql
CREATE TABLE clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  phone        text NOT NULL,
  email        text,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- null for guests
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### `appointments`
```sql
CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL, -- null until assigned
  date             date NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL, -- = start_time + duration_minutes
  duration_minutes integer NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes            text,
  created_by       text NOT NULL CHECK (created_by IN ('client','staff')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### `notifications`
```sql
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('new_booking','confirmed','cancelled')),
  read            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- services: publicly readable (booking form needs them), staff can write
CREATE POLICY "services_public_read"  ON services FOR SELECT USING (true);
CREATE POLICY "services_staff_write"  ON services FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM staff WHERE is_active = true));

-- staff: publicly readable (for assignment display), staff can write own row
CREATE POLICY "staff_public_read"     ON staff FOR SELECT USING (true);
CREATE POLICY "staff_staff_write"     ON staff FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM staff WHERE is_active = true));

-- appointments: staff can read/write all; anon can insert (via API route only)
CREATE POLICY "appointments_staff_all" ON appointments FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM staff WHERE is_active = true));
-- Note: client inserts go through API route using service_role key, bypassing RLS

-- clients: staff can read/write all
CREATE POLICY "clients_staff_all" ON clients FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM staff WHERE is_active = true));

-- notifications: staff only
CREATE POLICY "notifications_staff_all" ON notifications FOR ALL
  USING (auth.uid() IN (SELECT auth_user_id FROM staff WHERE is_active = true));
```

---

## 5. API Routes

All writes go through Next.js API routes using the Supabase **service_role** key (bypasses RLS — server-side only, never exposed to client).

### `POST /api/appointments`
Creates a new appointment from the public booking form.

**Request body:**
```json
{
  "client": { "name": "string", "phone": "string" },
  "service_id": "uuid",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_minutes": 60
}
```

**Logic:**
1. Validate all fields present and date is not Sunday / not in the past
2. Compute `end_time = start_time + duration_minutes`
3. Validate `end_time <= 20:00`
4. **Capacity check**: count appointments on same `date` where status IN ('pending','confirmed') and time windows overlap with requested window
   - Overlap condition: `start_time < requested_end_time AND end_time > requested_start_time`
   - If count >= 2 → return `409 { error: "No availability at this time" }`
5. **Upsert client by phone**:
   - Query `clients` where `phone = req.phone`
   - If found: use existing `client.id` (do NOT overwrite name — phone is the identity key)
   - If not found: insert new client with `{ name, phone }` and use new `client.id`
6. Insert appointment with `status: 'pending'`, `staff_id: null`, `created_by: 'client'`
7. Insert notification `{ type: 'new_booking' }`
8. Send email to manager/secretary (see Section 7)
9. Return `201 { appointment_id }`

**Error responses:**
| status | body | condition |
|---|---|---|
| 400 | `{ error: "Missing required fields" }` | Any field absent |
| 400 | `{ error: "Invalid date" }` | Sunday, past date, or end_time > 20:00 |
| 409 | `{ error: "No availability at this time" }` | Capacity full |
| 500 | `{ error: "Internal server error" }` | DB or email failure |

### `PATCH /api/appointments/[id]`
Update appointment — staff only (middleware verifies session).

**Patchable fields (all optional, partial updates allowed):**
```json
{
  "staff_id": "uuid",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_minutes": 60,
  "notes": "string"
}
```
Note: `status` is NOT patchable via this route — use dedicated routes (`/confirm`, or set cancelled/completed/no_show via status-specific actions in the dashboard). This prevents accidental invalid transitions.

**Logic:**
1. Verify appointment exists → 404 if not
2. If `date` or `start_time` or `duration_minutes` changed → re-run capacity check using the same overlap formula (`existing.start_time < new_end AND existing.end_time > new_start`), excluding the current appointment from the count → 409 if full
3. Validate `new end_time ≤ 20:00` and date is not Sunday → 400
4. Apply partial update, return `200 { appointment }`

**Status transitions** (from dashboard UI — each calls PATCH with the new status field separately):
| from | to | allowed |
|---|---|---|
| pending | confirmed | ✓ |
| pending | cancelled | ✓ |
| confirmed | completed | ✓ |
| confirmed | no_show | ✓ |
| confirmed | cancelled | ✓ |
| any | pending | ✗ (cannot revert to pending) |

Status update endpoint: `PATCH /api/appointments/[id]/status`
```json
{ "status": "confirmed|cancelled|completed|no_show" }
```
Returns 400 if transition is not allowed, 404 if not found, 200 on success.

**Error responses for PATCH:**
| status | condition |
|---|---|
| 404 | Appointment not found |
| 400 | Invalid date / end_time > 20:00 / Sunday |
| 409 | Capacity full after time change |
| 500 | DB failure |

### `DELETE /api/appointments/[id]`
Delete appointment — staff only. Returns `204`. Returns `404` if not found.

### `POST /api/appointments/[id]/confirm`
Shortcut to confirm a pending appointment — staff only.

**Guard conditions:**
- 404 if appointment not found
- 422 if appointment status is not `pending` (already confirmed, cancelled, etc.)
- No capacity re-check at confirmation time (capacity was checked at booking creation; pending slots are counted in capacity, so no race condition exists)

**Logic:**
1. Verify appointment exists and status === 'pending'
2. Update status to `confirmed`
3. Update `notifications` row for this appointment to `read: false` (refresh badge)
4. Send confirmation email to client (if `clients.email` is not null)
5. Return `200 { appointment }`

**Error responses:**
| status | condition |
|---|---|
| 404 | Appointment not found |
| 422 | Status is not pending |
| 500 | DB or email failure |

---

## 6. Time Slot Generation

Used by the booking form (step 3) to show available time slots. Logic runs **client-side** using a direct Supabase read.

**Step 1 — Generate candidate slots:**
- Interval: every 30 minutes
- Range: 10:00 → last slot where `slot_start + duration_minutes ≤ 20:00`
- Example: duration = 90 min → slots from 10:00 to 18:30 inclusive

**Step 2 — Fetch existing appointments for selected date:**
```typescript
const { data: existing } = await supabase
  .from('appointments')
  .select('start_time, end_time')
  .eq('date', selectedDate)
  .in('status', ['pending', 'confirmed'])
```

**Step 3 — Filter slots using identical overlap formula as the API:**
For each candidate slot:
```
slot_end = slot_start + duration_minutes
overlap_count = existing.filter(appt =>
  appt.start_time < slot_end AND appt.end_time > slot_start
).length

available = overlap_count < 2   // capacity = 2
```
Slots where `available === false` are greyed out and non-clickable.

**Displayed as**: a grid of time buttons (e.g. "10:00", "10:30") — grey + disabled if full.

Note: This check is advisory (UX). The API performs the authoritative check on submit. If a slot becomes full between the user loading the form and submitting, the API returns 409 and the form shows the conflict error.

---

## 7. Email Notifications

Using **Resend** with simple HTML email templates (no external template service needed for V1).

| trigger | recipient | subject | content |
|---|---|---|---|
| New booking (client submits form) | Manager + secretary email addresses (hardcoded in env vars) | "Nouvelle réservation — [Client Name]" | Client name, phone, service, date, time, link to dashboard |
| Appointment confirmed (staff confirms) | Client (if email provided) | "Votre rendez-vous est confirmé — Brazilian Studio" | Service, date, time, salon address, "À bientôt!" |
| Appointment cancelled (staff cancels) | Client (if email provided) | "Votre rendez-vous a été annulé" | Service, date, and apology message |

**Environment variables required:**
```
RESEND_API_KEY=
NOTIFY_EMAIL_1=   # manager email
NOTIFY_EMAIL_2=   # secretary email
```

---

## 8. Frontend Pages

### Public Website

#### `/booking` — Client booking page

Multi-step form (4 steps, no page reload):

**Step 1 — Service**: dropdown/cards showing service name + duration range
**Step 2 — Date**: date picker, Sundays disabled, past dates disabled
**Step 3 — Time**: 30-min slot grid, unavailable slots greyed out (fetched live from Supabase)
**Step 4 — Your info**: name (required), phone (required), email (optional)

Submit → `POST /api/appointments`

- **Success state**: "Merci! Nous confirmerons votre rendez-vous sous peu." + option to book again
- **Conflict error (409)**: "Ce créneau n'est plus disponible. Veuillez en choisir un autre." → returns to step 3
- **Other error**: "Une erreur est survenue. Veuillez réessayer."

### Dashboard (protected — `/dashboard/*`)

**Middleware (`middleware.ts`)**: checks Supabase session cookie on every `/dashboard/*` request. No session → redirect to `/login`.

#### `/login`
- Email + password form
- Supabase Auth `signInWithPassword`
- On success → redirect to `/dashboard/calendar`

#### `/dashboard/calendar`
**Data fetched**: all appointments for the displayed week/day range with:
- `id`, `date`, `start_time`, `end_time`, `duration_minutes`, `status`
- `clients(name, phone)`
- `services(name, color)`
- `staff(name)`

**Day view**: vertical timeline 10:00–20:00, appointment blocks positioned by time, colored by `service.color`
**Week view**: Mon–Sat columns, same block system
**Pending badge**: count of appointments where `status = 'pending'` shown in nav header
**Click appointment** → slide-over panel showing: client name + phone, service, date/time, assigned staff, status, notes + action buttons:
- Pending → **Confirm** / **Cancel**
- Confirmed → **Cancel** / **Mark Complete** / **Edit**

#### `/dashboard/appointments/new`
Same form as booking page but with additional fields: staff assignment, notes. Created with `created_by: 'staff'`, status: `confirmed` immediately (no pending for manual entries).

#### `/dashboard/staff`
Table of staff members: name, role, active status. Toggle active/inactive.

#### `/dashboard/services`
Table of services: name, duration range, color, active status. Edit min/max duration and color.

---

## 9. Authentication

| user type | auth method | access |
|---|---|---|
| Staff / Manager / Secretary | Supabase Auth email+password | Full `/dashboard/*` access |
| Guest client | None | Submit `/booking` form only |

**Client accounts (optional, "save my info")**: Deferred to V2. In V1, all client bookings are guest-only. The `clients.auth_user_id` column is present in the schema for future use but not populated in V1.

---

## 10. Real-time Sync

Supabase Realtime subscription active on `/dashboard/calendar` page:

```typescript
supabase
  .channel('appointments')
  .on('postgres_changes', {
    event: '*',          // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'appointments'
  }, (payload) => {
    // Re-fetch appointments for current view range
    // Update pending badge count
  })
  .subscribe()
```

**New booking flow:**
```
Client submits form
  → POST /api/appointments → row inserted (status: pending)
  → Supabase fires INSERT event
  → Dashboard calendar re-renders, badge increments
  → Email sent to manager + secretary
```

**Confirmation flow:**
```
Staff clicks Confirm
  → POST /api/appointments/[id]/confirm → status: confirmed
  → Supabase fires UPDATE event
  → Dashboard re-renders
  → Email sent to client (if email on file)
```

---

## 11. UI Design Guidelines

- **Aesthetic**: clean, feminine, elegant — soft pinks (#F8D7DA, #E8B4B8), rose gold accents (#B76E79), white space, rounded corners
- **Typography**: Geist or Inter (already in project via Next.js)
- **CSS strategy**: Tailwind CSS for all new pages (`/booking`, `/dashboard/*`). Existing pages (`/`, `/about`, `/services`, `/contact`) keep their CSS Modules — no migration needed
- **Animations**: Framer Motion kept for existing public pages; minimal/none in dashboard for performance
- **Responsive**: `/booking` is mobile-first; `/dashboard` targets tablet (768px+) and desktop

---

## 12. Tech Stack Summary

| layer | technology | notes |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | Existing |
| Styling | Tailwind CSS + existing CSS Modules + Framer Motion | Tailwind added for new pages |
| Database | Supabase PostgreSQL | Free tier |
| Auth | Supabase Auth | Email + password |
| Real-time | Supabase Realtime | Postgres changes subscription |
| Email | Resend | Free tier (3,000/month) |
| Deployment | Vercel | Existing project |

---

## 13. Out of Scope for V1

- Payment processing
- Client accounts / booking history view ("save my info" deferred to V2)
- SMS notifications
- Analytics dashboard
- Multi-location support
- Per-staff individual schedules (all active staff share salon hours)
- Appointment reminders (automated day-before emails)
