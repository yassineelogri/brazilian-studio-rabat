# Brazilian Studio — Salon Management System Design

**Date:** 2026-03-19
**Scope:** V1 — Appointment management only
**Status:** Approved

---

## 1. Overview

A full-stack salon management system for **Brazilian Studio Rabat**, built on top of an existing Next.js 14 website deployed on Vercel. The system enables clients to book appointments from the public website and staff to manage all appointments from a private dashboard — both synchronized in real time via Supabase.

**Business context:**
- Salon hours: Monday–Saturday, 10:00–20:00. Sunday closed.
- Staff: 2 active workers, 1 manager (occasional service provider), 1 secretary (admin only), 1 cleaning lady (not in booking system)
- Services have flexible durations (e.g. nail art: 2–3h, coiffure: 15–45min)
- Clients pick service + time only; staff is assigned internally by secretary/manager

---

## 2. Architecture

**Approach: Hybrid**

- **Reads**: Browser → Supabase client directly (fast, Row Level Security enforced)
- **Writes**: Browser → Next.js API routes → Supabase (business logic: overlap check, email notification, status transitions)
- **Real-time**: Supabase Realtime subscriptions on the `appointments` table → dashboard calendar updates instantly
- **Database**: Supabase (hosted PostgreSQL, free tier)
- **Auth**: Supabase Auth (email + password for staff; optional account for clients)
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Deployment**: Single Vercel project (public site + dashboard in one app)

---

## 3. Database Schema

### `staff`
| column | type | constraints |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| role | text | CHECK IN ('worker', 'manager', 'secretary') |
| auth_user_id | uuid | FK → auth.users, nullable |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |

### `services`
| column | type | constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL |
| description | text | nullable |
| min_duration | integer | minutes, NOT NULL |
| max_duration | integer | minutes, NOT NULL |
| color | text | hex color for calendar display |
| is_active | boolean | default true |

### `clients`
| column | type | constraints |
|---|---|---|
| id | uuid | PK |
| name | text | NOT NULL |
| phone | text | NOT NULL |
| email | text | nullable |
| auth_user_id | uuid | FK → auth.users, nullable (only if account created) |
| created_at | timestamptz | default now() |

### `appointments`
| column | type | constraints |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | FK → clients, NOT NULL |
| service_id | uuid | FK → services, NOT NULL |
| staff_id | uuid | FK → staff, nullable (assigned after booking) |
| date | date | NOT NULL |
| start_time | time | NOT NULL |
| end_time | time | NOT NULL (= start_time + duration_minutes) |
| duration_minutes | integer | NOT NULL (set manually — flexible durations) |
| status | text | CHECK IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show') |
| notes | text | nullable — internal only |
| created_by | text | CHECK IN ('client', 'staff') |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated |

### `notifications`
| column | type | constraints |
|---|---|---|
| id | uuid | PK |
| appointment_id | uuid | FK → appointments |
| type | text | CHECK IN ('new_booking', 'confirmed', 'cancelled') |
| read | boolean | default false |
| created_at | timestamptz | default now() |

---

## 4. API Routes

All writes go through Next.js API routes under `/api/`.

| route | method | description |
|---|---|---|
| `/api/appointments` | POST | Create appointment — validates no staff overlap, creates/finds client record, inserts notification, sends email to staff |
| `/api/appointments/[id]` | PATCH | Update appointment — status change, staff assignment, time reschedule |
| `/api/appointments/[id]` | DELETE | Delete appointment |
| `/api/appointments/[id]/confirm` | POST | Confirm pending appointment — sends confirmation email to client |
| `/api/clients` | POST | Create guest client record |

**Overlap prevention logic (in POST /api/appointments):**
1. Query all appointments for the requested date with status `confirmed`
2. Count available staff (workers + manager) not already booked in requested window
3. If 0 staff free → return 409 "No availability at this time"
4. If staff available → insert appointment with status `pending`, staff_id null

---

## 5. Frontend Pages

### Public Website (additions to existing site)

| path | description |
|---|---|
| `/booking` | Client-facing booking form |

**Booking form flow:**
1. Select service (dropdown with name + duration range)
2. Select date (date picker — Sundays and past dates disabled)
3. Select time slot (10:00–20:00, slots filtered by existing confirmed bookings)
4. Enter name + phone
5. Optional: "Save my info for next time" → creates Supabase Auth account
6. Submit → POST /api/appointments → status: `pending`
7. Success screen: "Thank you! We'll confirm your appointment soon."

### Dashboard (protected — staff + manager only)

| path | description |
|---|---|
| `/login` | Staff login (Supabase Auth email + password) |
| `/dashboard` | Redirects to `/dashboard/calendar` |
| `/dashboard/calendar` | Main view — day/week calendar with appointment blocks |
| `/dashboard/appointments/new` | Manual appointment creation (secretary) |
| `/dashboard/staff` | View and manage staff members |
| `/dashboard/services` | View and manage services + durations |

**Dashboard calendar:**
- Day view: vertical timeline 10:00–20:00, appointments as colored blocks by service color
- Week view: Mon–Sat column grid
- Pending appointments: pulsing badge count in nav header
- Click appointment → slide-over panel: client info, service, time, status actions (Confirm / Cancel / Edit / Assign staff)

---

## 6. Authentication

| user type | auth method | access |
|---|---|---|
| Staff / Manager | Supabase Auth email+password | `/dashboard/*` — full access |
| Secretary | Supabase Auth email+password | `/dashboard/*` — full access |
| Client (with account) | Supabase Auth email+password | Own bookings only (future V2 feature) |
| Guest client | None | Submit booking form only |

**Route protection:** Next.js middleware (`middleware.ts`) checks Supabase session on every `/dashboard/*` request. Unauthenticated requests redirect to `/login`.

---

## 7. Real-time Sync

Supabase Realtime subscription on the `appointments` table, active on all dashboard pages.

**Flow — new client booking:**
```
Client submits booking form
  → POST /api/appointments
  → Row inserted (status: pending)
  → Supabase fires INSERT event
  → Dashboard calendar re-renders with new appointment
  → Notification badge increments
  → Email sent to secretary/manager
```

**Flow — staff confirms appointment:**
```
Staff clicks Confirm on dashboard
  → POST /api/appointments/[id]/confirm
  → Row updated (status: confirmed)
  → Supabase fires UPDATE event
  → Dashboard re-renders in real time
  → Email sent to client with confirmation
```

---

## 8. UI Design Guidelines

- **Aesthetic**: Clean, feminine, elegant — soft pinks, rose gold accents, white space
- **Typography**: Modern sans-serif (Geist or Inter, already in project)
- **CSS**: Migrate from CSS Modules to Tailwind CSS (added as new dependency)
- **Animations**: Keep existing Framer Motion for page transitions; minimal in dashboard
- **Responsive**: Mobile-first for booking page; dashboard optimized for tablet/desktop

---

## 9. Tech Stack Summary

| layer | technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + existing Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| Email | Resend (free tier — 3,000 emails/month) |
| Deployment | Vercel (existing) |

---

## 10. Out of Scope for V1

- Payment processing
- Client accounts / booking history view
- SMS notifications
- Analytics dashboard
- Multi-location support
- Staff individual schedules (all share same hours for V1)
