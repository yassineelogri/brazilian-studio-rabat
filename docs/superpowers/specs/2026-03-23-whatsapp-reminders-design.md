# WhatsApp Appointment Reminders — Design Spec

**Date:** 2026-03-23
**Project:** Brazilian Studio Rabat
**Feature:** Automated WhatsApp reminders sent 24h and 2h before confirmed appointments
**Approach:** cron-job.org (free) pings a Vercel API route every 30 minutes

---

## 1. Overview

Clients receive two automatic WhatsApp messages before their appointment:
- **24 hours before** — "your appointment is tomorrow at 14h30"
- **2 hours before** — "your appointment is in 2 hours at 14h30"

Messages are sent via the official **Meta Cloud API (WhatsApp Business API)**, which is free up to 1,000 conversations/month. A `reminders` table prevents duplicates if the cron fires multiple times.

---

## 2. Database Change

Add one table in Supabase. Run this as a migration:

```sql
create table reminders (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  type            text not null check (type in ('24h', '2h')),
  sent_at         timestamptz not null default now(),
  unique (appointment_id, type)
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_staff_all" ON reminders FOR ALL USING (is_staff());
```

The `unique` constraint on `(appointment_id, type)` is the safety net — even if the cron fires twice in the same window, the second insert fails and no duplicate is sent.

Also add the `Reminder` type to `src/lib/supabase/types.ts`:

```ts
export interface Reminder {
  id: string
  appointment_id: string
  type: '24h' | '2h'
  sent_at: string
}
```

And add to the `Database.public.Tables` map:
```ts
reminders: { Row: Reminder; Insert: Omit<Reminder, 'id' | 'sent_at'>; Update: Partial<Omit<Reminder, 'id'>>; Relationships: DBRelationship[] }
```

---

## 3. WhatsApp Message Templates

Meta requires pre-approved templates for outbound messages. Submit these two in the Meta dashboard (see Section 6 for how).

### Template: `rdv_rappel_24h`
**Category:** UTILITY
**Language:** French (fr)

> Bonjour {{1}} 👋 Votre rendez-vous chez *Brazilian Studio Rabat* est demain à *{{2}}* pour *{{3}}*. Nous vous attendons ! Consultez ou annulez votre rendez-vous : {{4}}

Variables: `{{1}}` client name · `{{2}}` time (14h30) · `{{3}}` service name · `{{4}}` espace-client login URL (`/espace-client`)

**Note on `{{4}}`:** Always use the generic espace-client login URL (`https://<domain>/espace-client`), not a booking token URL. Booking tokens may be expired for appointments booked weeks in advance. The login URL is always valid and lets the client access their full portal.

**Note on cancellation:** The `canCancel()` function enforces a >24h window. At the time the 24h reminder fires, the client is still within the cancellation window, so including the portal link is useful and intentional.

### Template: `rdv_rappel_2h`
**Category:** UTILITY
**Language:** French (fr)

> Bonjour {{1}} ⏰ Votre rendez-vous est dans 2 heures à *{{2}}* pour *{{3}}* chez *Brazilian Studio Rabat*. À tout à l'heure !

Variables: `{{1}}` client name · `{{2}}` time · `{{3}}` service name

**Note:** No portal link in the 2h template — `canCancel()` enforces a >24h cancellation window so the client cannot cancel at this point. Including a now-useless link would add noise.

---

## 4. Files to Build

### `src/lib/whatsapp.ts`

Utility function wrapping the Meta Cloud API:

```ts
sendWhatsAppReminder(phone: string, templateName: string, params: string[]): Promise<{ ok: boolean; error?: string }>
```

- Calls `https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`
- Uses `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars
- Returns `{ ok: true }` on success or `{ ok: false, error: string }` on failure

**Phone number normalisation algorithm:**
1. Strip all spaces, dashes, parentheses
2. Remove leading `+`
3. If the result starts with `00`, replace `00` with nothing (e.g. `00212...` → `212...`)
4. If the result is 9 digits (e.g. `612345678`), prepend `212` → `212612345678`
5. If the result is 10 digits starting with `0` (e.g. `0612345678`), remove the leading `0` and prepend `212` → `212612345678`
6. Otherwise, assume the number already contains a country code and use as-is
7. Validate the final result matches `/^\d{10,15}$/` — if not, return `{ ok: false, error: 'invalid_phone' }` without calling the API

### `src/app/api/cron/reminders/route.ts`

Protected POST endpoint. Must use `createServerSupabaseClient()` (service-role) for all DB calls — this route has no session cookie and must not use cookie-based auth.

Logic:
1. Validate `x-cron-secret` header against `CRON_SECRET` env var → 401 if wrong or missing
2. Get current UTC timestamp (`new Date()`)
3. **24h window query:** fetch `confirmed` appointments where `starts_at` (the generated `timestamptz` column — do NOT use `date` + `start_time` separately, as that ignores the `Africa/Casablanca` timezone) is BETWEEN `now + 23h30` AND `now + 24h30`, joining `clients(name, phone)` and `services(name)`
4. **2h window query:** same but BETWEEN `now + 1h30` AND `now + 2h30`
5. For each appointment in each window:
   a. Check `reminders` table for existing row with `(appointment_id, type)` — skip if found
   b. Call `sendWhatsAppReminder` with the appropriate template and params
   c. **Only if `sendWhatsAppReminder` returns `{ ok: true }`:** insert into `reminders`
   d. If it returns `{ ok: false }`: log the error, do NOT insert — the next cron run will retry
6. Return `{ sent: number, skipped: number, errors: number }` JSON

**Retry behaviour:** Failed sends are intentionally not inserted into `reminders`. This means the next cron run (30 min later) will retry the send. Within a ±30 min window this means at most 2 retry attempts before the window passes.

### `.env.example` additions
```
WHATSAPP_TOKEN=            # Meta permanent system user token
WHATSAPP_PHONE_NUMBER_ID=  # e.g. 123456789012345
CRON_SECRET=               # random secret: openssl rand -hex 32
```

---

## 5. cron-job.org Configuration

1. Create free account at **cron-job.org**
2. Create a new cronjob:
   - **URL:** `https://<your-vercel-domain>/api/cron/reminders`
   - **Method:** POST
   - **Schedule:** Every 30 minutes (`*/30 * * * *`)
   - **Headers:** add `x-cron-secret` = your `CRON_SECRET` value
3. Enable the job — done

---

## 6. Meta Cloud API Setup (Step by Step)

This is a one-time setup. It takes about 30–60 minutes.

### Step 1 — Create a Meta Developer Account
1. Go to **developers.facebook.com**
2. Log in with your Facebook account (or create one)
3. Click **"Get Started"** and follow the verification steps

### Step 2 — Create a Meta App
1. Go to **My Apps → Create App**
2. Choose **"Business"** as the app type
3. Give it a name (e.g. "Brazilian Studio Reminders")
4. Under **"Add products to your app"**, find **WhatsApp** and click **Set Up**

### Step 3 — Get your test credentials
After adding WhatsApp to your app, Meta gives you:
- A **test phone number** (you don't need your own number yet)
- A **temporary access token** (valid 24h — for testing only)
- A **Phone Number ID** (permanent — copy this now)

Go to **WhatsApp → API Setup** in your app dashboard to find these.

### Step 4 — Create a System User Token (permanent token)
The temporary token expires after 24 hours. For production you need a permanent one:
1. Go to **business.facebook.com → Business Settings** (look in the left sidebar for "Business Settings" — if you see Meta Business Suite instead, click the gear icon ⚙️ usually at the bottom left)
2. Under **Users → System Users**, create a new System User with **Admin** role
3. Click **"Generate New Token"** → select your app → check `whatsapp_business_messaging` permission
4. Copy the token — **you only see it once**, save it somewhere safe

> **If you can't find System Users:** go to `business.facebook.com/settings/system-users` directly in your browser.

### Step 5 — Add your real WhatsApp Business number
1. In your app dashboard, go to **WhatsApp → Phone Numbers → Add Phone Number**
2. Enter your salon's WhatsApp Business number
3. Verify it via SMS or call
4. This gives you a real **Phone Number ID** to replace the test one

> **Note:** Your WhatsApp number will be moved to the Meta Cloud API. It will still work normally for sending/receiving messages but must be managed via the Meta dashboard going forward.

### Step 6 — Submit message templates for approval
1. Go to **WhatsApp → Message Templates → Create Template**
2. Create `rdv_rappel_24h` (see Section 3 above for the exact text)
3. Create `rdv_rappel_2h`
4. Submit for review — approval usually takes **a few minutes to a few hours**
5. Status changes to **"Approved"** when ready — you cannot send template messages until this shows Approved

### Step 7 — Add env vars to Vercel
In your Vercel project → Settings → Environment Variables, add:
- `WHATSAPP_TOKEN` = your system user token (from Step 4)
- `WHATSAPP_PHONE_NUMBER_ID` = your real phone number ID (from Step 5)
- `CRON_SECRET` = a random secret (generate with `openssl rand -hex 32` or any random string generator)

---

## 7. Error Handling

- **Failed Meta API call:** log the error, do not insert into `reminders`, allow retry on next cron run
- **Invalid phone number** (after normalisation): log and skip — do not crash the entire cron run
- **Client with no phone:** the `clients.phone` column is `NOT NULL` so this cannot happen — but always check for empty string defensively before calling the API
- **Appointment cancelled after 24h reminder sent:** no action needed — the reminder already fired, the client can see the cancelled status in their espace-client
- **Templates not yet approved:** Meta will return a 400 error — log it clearly so it is easy to diagnose during initial setup

---

## 8. Scope

**In scope:**
- 24h and 2h WhatsApp reminders for confirmed appointments
- Duplicate prevention via `reminders` table unique constraint
- Cron endpoint secured with `x-cron-secret` header
- Phone number normalisation for Moroccan numbers (+212)
- Retry on failure (via non-insert on error)

**Out of scope:**
- SMS fallback
- Email reminders (existing email notifications cover confirmation; reminders are WhatsApp-only)
- Reminder for rescheduled appointments (treated as a new confirmed appointment — will trigger its own reminders)
- Admin UI to view reminder send logs
- WhatsApp opt-out / unsubscribe flow
- Reminders for `pending` appointments (only `confirmed` appointments trigger reminders)
