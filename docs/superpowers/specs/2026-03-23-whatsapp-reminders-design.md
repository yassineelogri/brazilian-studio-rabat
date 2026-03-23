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

Add one table in Supabase:

```sql
create table reminders (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  type            text not null check (type in ('24h', '2h')),
  sent_at         timestamptz not null default now(),
  unique (appointment_id, type)
);
```

The `unique` constraint on `(appointment_id, type)` is the safety net — even if the cron fires twice in the same window, the second insert fails silently and no duplicate is sent.

---

## 3. WhatsApp Message Templates

Meta requires pre-approved templates for outbound messages. Submit these two in the Meta dashboard (see Section 6 for how).

### Template: `rdv_rappel_24h`
**Category:** UTILITY
**Language:** French (fr)

> Bonjour {{1}} 👋 Votre rendez-vous chez *Brazilian Studio Rabat* est demain à *{{2}}* pour *{{3}}*. Nous vous attendons ! Pour annuler ou consulter votre espace client : {{4}}

Variables: `{{1}}` client name · `{{2}}` time (14h30) · `{{3}}` service name · `{{4}}` espace-client URL

### Template: `rdv_rappel_2h`
**Category:** UTILITY
**Language:** French (fr)

> Bonjour {{1}} ⏰ Votre rendez-vous est dans 2 heures à *{{2}}* pour *{{3}}* chez *Brazilian Studio Rabat*. À tout à l'heure !

Variables: `{{1}}` client name · `{{2}}` time · `{{3}}` service name

---

## 4. Files to Build

### `src/lib/whatsapp.ts`
Utility function wrapping the Meta Cloud API:

```ts
sendWhatsAppReminder(phone: string, templateName: string, params: string[])
```

Calls `https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` with the template name and ordered parameter array. Returns `{ ok: boolean }`.

Phone numbers must be in international format without `+` (e.g. `212612345678` for Morocco).

### `src/app/api/cron/reminders/route.ts`
Protected POST endpoint:

1. Validate `x-cron-secret` header against `CRON_SECRET` env var → 401 if wrong
2. Compute current UTC time
3. **24h query:** fetch `confirmed` appointments where `starts_at` BETWEEN `now + 23h30` AND `now + 24h30`, with client name/phone and service name joined
4. **2h query:** same but BETWEEN `now + 1h30` AND `now + 2h30`
5. For each result: check `reminders` table for existing `(appointment_id, type)` row
6. If not found: call `sendWhatsAppReminder`, then insert into `reminders`
7. Return `{ sent, skipped, errors }` JSON

### `.env.example` additions
```
WHATSAPP_TOKEN=            # Meta permanent system user token
WHATSAPP_PHONE_NUMBER_ID=  # e.g. 123456789012345
CRON_SECRET=               # random secret, e.g. openssl rand -hex 32
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
The temporary token expires. For production you need a permanent one:
1. Go to **business.facebook.com → Settings → System Users**
2. Create a new System User with **Admin** role
3. Click **"Generate New Token"** → select your app → check `whatsapp_business_messaging` permission
4. Copy the token — **you only see it once**

### Step 5 — Add your real WhatsApp Business number
1. In your app dashboard, go to **WhatsApp → Phone Numbers → Add Phone Number**
2. Enter your salon's WhatsApp Business number
3. Verify it via SMS or call
4. This gives you a real **Phone Number ID** to replace the test one

### Step 6 — Submit message templates for approval
1. Go to **WhatsApp → Message Templates → Create Template**
2. Create `rdv_rappel_24h` (see Section 3 above for the exact text)
3. Create `rdv_rappel_2h`
4. Submit for review — approval usually takes **a few minutes to a few hours**
5. Status changes to **"Approved"** when ready

### Step 7 — Add env vars to Vercel
In your Vercel project → Settings → Environment Variables, add:
- `WHATSAPP_TOKEN` = your system user token
- `WHATSAPP_PHONE_NUMBER_ID` = your real phone number ID
- `CRON_SECRET` = a random secret (generate with `openssl rand -hex 32`)

---

## 7. Error Handling

- If Meta API returns an error (e.g. invalid phone format, template not approved), log the error and mark the reminder as `error` — do not retry automatically to avoid spam
- Phone numbers are stored as entered by staff. The utility function strips spaces, `+`, and leading zeros and prepends `212` (Morocco) if no country code is detected
- Appointments cancelled after a reminder is already sent: no action needed (reminder was already sent, client can see the cancelled status in their espace-client)

---

## 8. Scope

**In scope:**
- 24h and 2h WhatsApp reminders for confirmed appointments
- Duplicate prevention via `reminders` table
- Cron endpoint secured with secret header
- Phone number normalization for Morocco (+212)

**Out of scope:**
- SMS fallback
- Reminder for rescheduled appointments (treated as new confirmed appointment)
- Admin UI to view reminder logs (can be added later)
- WhatsApp opt-out / unsubscribe flow
