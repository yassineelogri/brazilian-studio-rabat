# WhatsApp Appointment Reminders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically send WhatsApp messages to clients 24h and 2h before their confirmed appointments using Meta Cloud API, triggered by a cron-job.org endpoint every 30 minutes.

**Architecture:** A protected POST endpoint `/api/cron/reminders` is pinged every 30 minutes by cron-job.org. It queries confirmed appointments in two time windows (23h30–24h30 and 1h30–2h30 from now), skips any already recorded in the `reminders` table, sends WhatsApp messages via Meta Cloud API, then inserts successful sends into `reminders` to prevent duplicates.

**Tech Stack:** Next.js 14 App Router, Supabase (service-role client), Meta Cloud API (graph.facebook.com v19.0), TypeScript, cron-job.org (external scheduler)

**Spec:** `docs/superpowers/specs/2026-03-23-whatsapp-reminders-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/whatsapp.ts` | Meta Cloud API call + phone normalisation |
| Create | `src/app/api/cron/reminders/route.ts` | Cron endpoint — query windows, dedupe, send |
| Modify | `src/lib/supabase/types.ts` | Add `Reminder` interface + Database table entry |
| Create | `supabase/migrations/007_reminders_table.sql` | SQL migration for `reminders` table |
| Modify | `.env.example` | Document new env vars |

---

## Task 1: Database Migration — `reminders` table

**Files:**
- Create: `supabase/migrations/007_reminders_table.sql`

- [ ] **Step 1.1: Check where existing migrations live**

```bash
ls supabase/migrations/
```

Expected: a list of `.sql` files like `001_initial_schema.sql`. Confirm the directory exists.

- [ ] **Step 1.2: Create the migration file**

Create `supabase/migrations/007_reminders_table.sql` with this exact content:

```sql
-- Tracks which WhatsApp reminders have been sent for each appointment.
-- The unique constraint on (appointment_id, type) prevents duplicate sends
-- if the cron fires multiple times within the same window.

create table if not exists reminders (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  type            text not null check (type in ('24h', '2h')),
  sent_at         timestamptz not null default now(),
  unique (appointment_id, type)
);

alter table reminders enable row level security;

create policy "reminders_staff_all" on reminders
  for all using (is_staff());
```

- [ ] **Step 1.3: Run the migration in Supabase**

Option A — Supabase CLI (if installed):
```bash
supabase db push
```

Option B — Supabase Dashboard:
1. Go to your Supabase project → **SQL Editor**
2. Paste the SQL above and click **Run**
3. Confirm the `reminders` table appears under **Table Editor**

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/007_reminders_table.sql
git commit -m "feat: add reminders table migration"
```

---

## Task 2: Add `Reminder` Type to `types.ts`

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 2.1: Add the `Reminder` interface**

Open `src/lib/supabase/types.ts`. After the `BookingToken` interface (around line 75), add:

```ts
export interface Reminder {
  id: string
  appointment_id: string
  type: '24h' | '2h'
  sent_at: string
}
```

- [ ] **Step 2.2: Add `reminders` to the `Database` type**

In the same file, find the `Database.public.Tables` block (the large object near the bottom). After the `booking_tokens` line, add:

```ts
reminders: { Row: Reminder; Insert: Omit<Reminder, 'id' | 'sent_at'>; Update: Partial<Omit<Reminder, 'id'>>; Relationships: DBRelationship[] }
```

- [ ] **Step 2.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.4: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add Reminder type to supabase types"
```

---

## Task 3: WhatsApp Utility — `src/lib/whatsapp.ts`

**Files:**
- Create: `src/lib/whatsapp.ts`

This file follows the same lazy-singleton pattern as `src/lib/resend.ts`. It handles phone normalisation and the Meta Cloud API call.

- [ ] **Step 3.1: Create `src/lib/whatsapp.ts`**

```ts
/**
 * WhatsApp utility — wraps Meta Cloud API message sends.
 * Uses WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.
 * Never import in client components.
 */

export interface WhatsAppResult {
  ok: boolean
  error?: string
}

/**
 * Normalise a phone number to E.164 format without the leading +.
 * Handles Moroccan local formats (9-digit, 10-digit with leading 0).
 * Returns null if the result is invalid.
 */
export function normalisePhone(raw: string): string | null {
  // Strip spaces, dashes, parentheses, dots
  let n = raw.replace(/[\s\-().]/g, '')

  // Remove leading +
  if (n.startsWith('+')) n = n.slice(1)

  // Remove leading 00 (international dialling prefix)
  if (n.startsWith('00')) n = n.slice(2)

  // Moroccan local: 9 digits starting with 6 or 7 (mobile) or 5 (fixed)
  if (/^\d{9}$/.test(n)) n = '212' + n

  // Moroccan local: 10 digits starting with 0
  if (/^0\d{9}$/.test(n)) n = '212' + n.slice(1)

  // Validate: must be 10–15 digits
  if (!/^\d{10,15}$/.test(n)) return null

  return n
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 *
 * @param phone  Raw phone number as stored in DB (will be normalised)
 * @param templateName  Approved template name, e.g. 'rdv_rappel_24h'
 * @param params  Ordered array of template variable values: ['Client Name', '14h30', 'Épilation']
 */
export async function sendWhatsAppReminder(
  phone: string,
  templateName: string,
  params: string[]
): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured' }
  }

  const to = normalisePhone(phone)
  if (!to) {
    return { ok: false, error: 'invalid_phone' }
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: params.map(value => ({ type: 'text', text: value })),
        },
      ],
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const detail = await res.text()
      return { ok: false, error: `Meta API ${res.status}: ${detail}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/whatsapp.ts
git commit -m "feat: add WhatsApp utility with phone normalisation and Meta Cloud API call"
```

---

## Task 4: Cron Endpoint — `/api/cron/reminders`

**Files:**
- Create: `src/app/api/cron/reminders/route.ts`

- [ ] **Step 4.1: Create the directory**

```bash
mkdir -p src/app/api/cron/reminders
```

- [ ] **Step 4.2: Create `route.ts`**

```ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppReminder } from '@/lib/whatsapp'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const now = new Date()

  let sent = 0
  let skipped = 0
  let errors = 0

  // ── Helper: process one time window ──────────────────────────────────────
  // windowStartMinutes and windowEndMinutes are both added to now() — they are
  // positive offsets into the future (e.g. 1410 = 23h30 from now).
  async function processWindow(
    windowStartMinutes: number,
    windowEndMinutes: number,
    reminderType: '24h' | '2h',
    templateName: string
  ) {
    const windowStart = new Date(now.getTime() + windowStartMinutes * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + windowEndMinutes   * 60 * 1000)

    // Fetch confirmed appointments whose starts_at falls in the window
    // Always use starts_at (the stored timestamptz) — never date+start_time separately
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        clients ( name, phone ),
        services ( name )
      `)
      .eq('status', 'confirmed')
      .gte('starts_at', windowStart.toISOString())
      .lte('starts_at', windowEnd.toISOString())

    if (fetchError) {
      console.error(`[reminders] fetch error for ${reminderType}:`, fetchError.message)
      return
    }

    for (const appt of appointments ?? []) {
      // Check for existing reminder (deduplication)
      const { data: existing } = await supabase
        .from('reminders')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('type', reminderType)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Supabase-JS may return joined relations as an array (when Relationships metadata
      // is empty) or as a single object (when FK is inferred). Handle both cases safely.
      const rawClient = appt.clients as { name: string; phone: string } | { name: string; phone: string }[] | null
      const client = Array.isArray(rawClient) ? (rawClient[0] ?? null) : rawClient
      const rawService = appt.services as { name: string } | { name: string }[] | null
      const service = Array.isArray(rawService) ? (rawService[0] ?? null) : rawService

      if (!client?.phone) {
        console.warn(`[reminders] appointment ${appt.id} has no client phone — skipping`)
        skipped++
        continue
      }

      // Build template params
      const timeLabel = appt.start_time.slice(0, 5).replace(':', 'h') // "14:30" → "14h30"
      const params: string[] = reminderType === '24h'
        ? [client.name, timeLabel, service?.name ?? '', `${SITE_URL}/espace-client`]
        : [client.name, timeLabel, service?.name ?? '']

      const result = await sendWhatsAppReminder(client.phone, templateName, params)

      if (result.ok) {
        await supabase.from('reminders').insert({
          appointment_id: appt.id,
          type: reminderType,
        })
        sent++
        console.log(`[reminders] sent ${reminderType} reminder for appointment ${appt.id}`)
      } else {
        errors++
        console.error(`[reminders] failed ${reminderType} reminder for appointment ${appt.id}:`, result.error)
        // Do NOT insert — next cron run will retry
      }
    }
  }

  // ── 24h window: starts_at between now+23h30 and now+24h30 ────────────────
  await processWindow(23 * 60 + 30, 24 * 60 + 30, '24h', 'rdv_rappel_24h')

  // ── 2h window: starts_at between now+1h30 and now+2h30 ───────────────────
  await processWindow(1 * 60 + 30, 2 * 60 + 30, '2h', 'rdv_rappel_2h')

  return NextResponse.json({ sent, skipped, errors })
}
```

- [ ] **Step 4.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "Property 'reminders' does not exist on type...", Task 2 (types.ts update) was not completed — go back and finish it first.

- [ ] **Step 4.4: Run the build**

```bash
npm run build
```

Expected: exits with 0. The new route should appear in the build output under `/api/cron/reminders`.

- [ ] **Step 4.5: Commit**

```bash
git add src/app/api/cron/reminders/route.ts
git commit -m "feat: add /api/cron/reminders endpoint for WhatsApp appointment reminders"
```

---

## Task 5: Document Environment Variables

**Files:**
- Modify: `.env.example` (create it if it doesn't exist)

- [ ] **Step 5.1: Add the new vars to `.env.example`**

Open `.env.example` (or create it) and add these lines:

```bash
# WhatsApp Business API (Meta Cloud API)
# Get these from your Meta Developer app → WhatsApp → API Setup
WHATSAPP_TOKEN=                  # Permanent system user token
WHATSAPP_PHONE_NUMBER_ID=        # e.g. 123456789012345

# Cron endpoint security
# Generate with: openssl rand -hex 32
# Set the same value in cron-job.org request header: x-cron-secret
CRON_SECRET=
```

- [ ] **Step 5.2: Add vars to Vercel**

In Vercel project → Settings → Environment Variables, add:
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `CRON_SECRET` (generate: `openssl rand -hex 32`)

- [ ] **Step 5.3: Commit**

```bash
git add .env.example
git commit -m "docs: add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, CRON_SECRET to .env.example"
```

---

## Task 6: Deploy & Wire Up cron-job.org

- [ ] **Step 6.1: Push to main and confirm Vercel deploy succeeds**

```bash
git push origin main
```

Watch the Vercel dashboard. Build must pass (green). If it fails, check build logs — most likely a TypeScript error.

- [ ] **Step 6.2: Test the endpoint manually (no WhatsApp yet)**

With your `CRON_SECRET` value set in Vercel, call the endpoint:

```bash
curl -X POST https://<your-vercel-domain>/api/cron/reminders \
  -H "x-cron-secret: <your-CRON_SECRET>"
```

Expected response: `{"sent":0,"skipped":0,"errors":0}` (no appointments in the test windows yet).

If you get `{"error":"Unauthorized"}` — check that `CRON_SECRET` is set in Vercel environment variables and that the deployment is the latest.

- [ ] **Step 6.3: Set up cron-job.org**

1. Create a free account at **cron-job.org**
2. Click **"Create cronjob"**
3. Fill in:
   - **URL:** `https://<your-vercel-domain>/api/cron/reminders`
   - **Execution schedule:** Every 30 minutes
   - **Request method:** POST
4. Expand **"Advanced"** → **"Headers"** → add header:
   - Name: `x-cron-secret`
   - Value: your `CRON_SECRET`
5. Save and **enable** the job

- [ ] **Step 6.4: Verify cron-job.org fires correctly**

After 30 minutes, check the **Execution history** tab on cron-job.org. You should see:
- HTTP status: `200`
- Response body: `{"sent":0,"skipped":0,"errors":0}`

---

## Task 7: Meta Cloud API Setup & Template Approval

This is the one-time Meta configuration. Follow the step-by-step guide in the spec:
`docs/superpowers/specs/2026-03-23-whatsapp-reminders-design.md` → **Section 6**.

- [ ] **Step 7.1: Create Meta Developer account and app**
  Follow spec Section 6, Steps 1–2.

- [ ] **Step 7.2: Get Phone Number ID and create permanent system user token**
  Follow spec Section 6, Steps 3–4. Save the token — you only see it once.

- [ ] **Step 7.3: Add your real WhatsApp Business number**
  Follow spec Section 6, Step 5.

- [ ] **Step 7.4: Submit `rdv_rappel_24h` template for approval**

  In Meta dashboard → WhatsApp → Message Templates → Create Template:
  - **Name:** `rdv_rappel_24h`
  - **Category:** Utility
  - **Language:** French (fr)
  - **Body text:**
    ```
    Bonjour {{1}} 👋 Votre rendez-vous chez *Brazilian Studio Rabat* est demain à *{{2}}* pour *{{3}}*. Nous vous attendons ! Consultez ou annulez votre rendez-vous : {{4}}
    ```

- [ ] **Step 7.5: Submit `rdv_rappel_2h` template for approval**

  - **Name:** `rdv_rappel_2h`
  - **Category:** Utility
  - **Language:** French (fr)
  - **Body text:**
    ```
    Bonjour {{1}} ⏰ Votre rendez-vous est dans 2 heures à *{{2}}* pour *{{3}}* chez *Brazilian Studio Rabat*. À tout à l'heure !
    ```

- [ ] **Step 7.6: Wait for template approval**

  Both templates must show status **"Approved"** before messages can be sent. This usually takes a few minutes to a few hours.

- [ ] **Step 7.7: Update Vercel env vars with real credentials**

  Replace the test values with:
  - `WHATSAPP_TOKEN` = permanent system user token
  - `WHATSAPP_PHONE_NUMBER_ID` = your real phone number ID

  Trigger a Vercel redeploy (or the next deploy will pick them up automatically).

---

## Task 8: End-to-End Test

- [ ] **Step 8.1: Create a test appointment**

  In the dashboard, create a new `confirmed` appointment set to exactly 24 hours from now (or 2 hours from now if you want to test the 2h reminder). Make sure the client has a valid Moroccan mobile phone number.

- [ ] **Step 8.2: Trigger the cron manually**

```bash
curl -X POST https://<your-vercel-domain>/api/cron/reminders \
  -H "x-cron-secret: <your-CRON_SECRET>"
```

Expected: `{"sent":1,"skipped":0,"errors":0}`

- [ ] **Step 8.3: Verify the WhatsApp message arrived**

  Check the client's WhatsApp. The message should arrive within a few seconds.

- [ ] **Step 8.4: Test deduplication**

  Trigger the cron again immediately:

```bash
curl -X POST https://<your-vercel-domain>/api/cron/reminders \
  -H "x-cron-secret: <your-CRON_SECRET>"
```

Expected: `{"sent":0,"skipped":1,"errors":0}` — the reminder was already sent, no duplicate.

- [ ] **Step 8.5: Verify `reminders` table in Supabase**

  In Supabase → Table Editor → `reminders`, you should see a row for the test appointment with `type = '24h'` (or `'2h'`).

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/migrations/007_reminders_table.sql` | New — creates `reminders` table with RLS |
| `src/lib/supabase/types.ts` | Add `Reminder` interface and `reminders` DB table entry |
| `src/lib/whatsapp.ts` | New — phone normalisation + Meta Cloud API call |
| `src/app/api/cron/reminders/route.ts` | New — cron endpoint, deduplication, two windows |
| `.env.example` | Add 3 new env var entries |

**External configuration:**
- Vercel: 3 new env vars (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `CRON_SECRET`)
- cron-job.org: 1 job, POST every 30 min with `x-cron-secret` header
- Meta: 1 app, 1 WhatsApp phone number, 2 approved message templates
