# Brazilian Studio — V4 Client Portal Design

**Date:** 2026-03-21
**Scope:** V4 — Espace Client (Client-facing portal)
**Status:** Draft
**Depends on:** V1 (appointments), V2 (products), V3 (devis/factures)

---

## 1. Overview

V4 adds a client-facing portal at `/espace-client` where clients can view their upcoming and past appointments, cancel within 24h, book new appointments, view their devis and factures, and update their profile. Authentication uses Supabase magic links (email). Clients without email or who lose their link access their booking via a private token URL.

**Key constraints:**
- Zero changes to staff dashboard (V1–V3 untouched)
- Two auth paths: magic link (full portal) and private token (single booking view)
- All cancellation logic server-side — client UI just shows/hides buttons
- Emails non-blocking (fire-and-forget, same `.catch()` pattern as low-stock alerts)
- Token generated at booking time, never lazily
- `appointments` table has `date date` + `start_time time` (no `starts_at` column) — migration 004 adds a generated `starts_at` column for convenience

---

## 2. Architecture

Same hybrid pattern as V1–V3:
- **Reads:** Browser → Supabase client directly (anon key + client session JWT, RLS enforced)
- **Writes:** Browser → Next.js API routes → Supabase (service_role key)
- **Auth:** Supabase PKCE magic link for clients; entirely separate from staff auth
- **Email:** Resend (existing client)

**Middleware update:** Extend `src/middleware.ts` to protect `/espace-client/*` while keeping `/espace-client` (login page) and `/espace-client/acces/*` (token pages) public. The auth check verifies any non-null Supabase user — RLS policies enforce data isolation between clients and staff. A staff user authenticated in another tab would technically pass the check, but their `get_client_id()` returns NULL so they see no data.

Updated `config.matcher`:
```ts
export const config = {
  matcher: ['/dashboard/:path*', '/espace-client/:path*'],
}
```

The middleware must NOT protect `/espace-client` itself (the login page) or `/espace-client/acces/:path*` (public token pages) — use `pathname.startsWith('/espace-client/dashboard') || pathname.startsWith('/espace-client/appointments') || ...` to gate only the authenticated sub-routes.

**Client logout:** `src/app/espace-client/dashboard/page.tsx` includes a logout button that calls `supabase.auth.signOut()` (browser client) then `router.push('/espace-client')`.

---

## 3. Database Schema

### `starts_at` generated column (added to `appointments`)
```sql
ALTER TABLE appointments
  ADD COLUMN starts_at timestamptz
    GENERATED ALWAYS AS ((date + start_time) AT TIME ZONE 'Africa/Casablanca') STORED;
```
This allows consistent UTC-based comparisons for the 24h cancellation rule without changing existing queries. All references to the cancellation window use `starts_at`.

### `booking_tokens`
```sql
CREATE TABLE booking_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_tokens_appointment_id_key UNIQUE (appointment_id)
);

ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
-- No client RLS policy needed — accessed only via service_role in API routes
```

`UNIQUE (appointment_id)` ensures one token per appointment. `POST /api/client/tokens` uses `ON CONFLICT (appointment_id) DO UPDATE SET expires_at = now() + interval '30 days' RETURNING *` to refresh expiry if called again from the staff dashboard.

### Helper function
```sql
CREATE OR REPLACE FUNCTION get_client_id()
RETURNS uuid AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```
Returns NULL for any user with no matching `clients` row (unauthenticated, staff accounts, etc.). All client RLS policies evaluate to false when NULL — intentional, not a bug.

### New RLS policies

```sql
-- clients can read their own profile row
CREATE POLICY "clients can view own profile"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

-- clients can read their own appointments
CREATE POLICY "clients can view own appointments"
  ON appointments FOR SELECT
  USING (client_id = get_client_id());

-- clients can read their own devis
CREATE POLICY "clients can view own devis"
  ON devis FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis_items"
  ON devis_items FOR SELECT
  USING (devis_id IN (SELECT id FROM devis WHERE client_id = get_client_id()));

-- clients can read their own factures
CREATE POLICY "clients can view own factures"
  ON factures FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own facture_items"
  ON facture_items FOR SELECT
  USING (facture_id IN (SELECT id FROM factures WHERE client_id = get_client_id()));
```

### `clients` table (no schema change)
`auth_user_id` already exists. On first magic-link login, the callback handler matches the Supabase user by email to an existing `clients` row and writes `auth_user_id` (service_role UPDATE).

---

## 4. URL Structure

```
/espace-client                         Public — login page (email input)
/espace-client/dashboard               Auth — timeline dashboard
/espace-client/appointments/[id]       Auth — appointment detail + cancel
/espace-client/devis                   Auth — client's quotes list
/espace-client/factures                Auth — client's invoices list
/espace-client/profile                 Auth — update name, email, phone
/espace-client/acces/[token]           Public — private token view (single booking)
```

---

## 5. API Routes

All client-facing API routes under `/api/client/*`. Staff routes under `/api/` are unchanged.

**Authentication pattern for client API routes:**
```ts
async function requireClient() {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('clients').select('id, name, phone, email')
    .eq('auth_user_id', user.id).single()
  return data ?? null
}
```
Uses service_role to read the client row (bypasses RLS for this lookup). All other data queries use explicit `WHERE client_id = client.id` filters rather than relying on RLS, consistent with V1–V3 write routes.

---

### `POST /api/client/auth/magic-link`
Send magic link email.

**Request body:** `{ "email": "client@example.com" }`

**Logic:**
```ts
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/client/auth/callback`,
  },
})
```
Returns `200` always (do not reveal whether email exists — prevents account enumeration).

**Note:** `NEXT_PUBLIC_SITE_URL/api/client/auth/callback` must be added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.

---

### `GET /api/client/auth/callback`
Supabase PKCE callback handler. Receives `?code=...` query param from Supabase.

**Logic:**
```ts
const code = searchParams.get('code')
const supabase = createServerSupabaseClient()  // service_role
const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
// Must set auth cookies on the response before redirecting — use @supabase/ssr's
// createServerClient with cookie handlers, not service_role, for the exchange:
```

**Important:** Use `createServerClient` (from `@supabase/ssr`) with proper cookie-setting handlers for the code exchange — not the service_role client. The session must be written to cookies so subsequent requests are authenticated. After exchange:

1. Look up `clients` row by `user.email` using service_role
2. If found and `auth_user_id` is null → UPDATE `clients SET auth_user_id = user.id WHERE email = user.email`
3. If found and `auth_user_id` already set → no-op
4. If not found → redirect to `/espace-client?error=not_found`
5. On success → redirect to `/espace-client/dashboard`

Response must use `NextResponse.redirect(...)` with the cookie-setting response from the `@supabase/ssr` client.

---

### `GET /api/client/appointments`
Returns client's appointments ordered by `starts_at DESC`.

**Auth:** `requireClient()`

**Query params:** `filter` — `upcoming` (starts_at > now), `past` (starts_at ≤ now), omit for all

**Response:** Array of appointments including `service: { name, color }` and `staff: { name } | null`. Uses service_role with explicit `WHERE client_id = client.id` filter.

---

### `POST /api/client/appointments/[id]/cancel`
Cancel an appointment (authenticated client).

**Auth:** `requireClient()` — verifies `appointment.client_id === client.id`

**Logic:**
```
1. Fetch appointment — verify client_id matches
2. If status === 'cancelled' → return 200 (idempotent no-op)
3. If !['pending', 'confirmed'].includes(status) → 422 { error: 'invalid_status' }
4. If (appointment.starts_at.getTime() - Date.now()) < 24 * 60 * 60 * 1000
     → 422 { error: 'too_late_to_cancel' }
   (starts_at is the generated timestamptz column — already UTC)
5. UPDATE appointments SET status = 'cancelled' WHERE id = appointment.id
6. Return 200
7. [async, non-blocking] Send cancellation email to client (if email exists)
8. [async, non-blocking] Insert into notifications + send manager email
```

---

### `POST /api/client/tokens/[token]/cancel`
Cancel an appointment via private token (no login required).

**Auth:** None — ownership verified via token lookup.

**Logic:**
```
1. Look up token in booking_tokens
2. If not found → 404
3. If expires_at < now() → 410 { error: 'token_expired' }
4. Fetch appointment via token.appointment_id
5. Apply same guards as authenticated cancel (idempotency, status, 24h rule)
6. UPDATE status = 'cancelled'
7. Return 200
8. [async, non-blocking] Same email + notification side-effects
```

---

### `GET /api/client/profile`
**Auth:** `requireClient()`

Returns: `{ id, name, phone, email }`

---

### `PATCH /api/client/profile`
**Auth:** `requireClient()`

**Allowed fields:** `name`, `phone`

**Email changes are intentionally excluded** from this endpoint. Email is the magic-link auth identity — changing it requires Supabase account update + re-confirmation flow which creates a divergence window between `clients.email` and `auth.users.email`. To avoid inconsistent state, email can only be updated by contacting staff. The profile form shows email as read-only with a note: "Pour modifier votre email, contactez le salon."

**Logic:** Validate name non-empty, phone format. UPDATE clients row. Return `200` with updated profile.

---

### `GET /api/client/tokens/[token]`
Resolve private token → booking data (no auth required).

**Logic:**
1. Look up token in `booking_tokens`
2. If not found → 404
3. If `expires_at < now()` → 410 `{ error: 'token_expired' }`
4. Return appointment + client name + service name + staff name

---

### `POST /api/client/tokens` (staff-only)
Generate or refresh a private token for an appointment.

**Auth:** `requireStaff()`

**Request body:** `{ "appointment_id": "uuid" }`

**Logic:**
```sql
INSERT INTO booking_tokens (client_id, appointment_id)
VALUES ($client_id, $appointment_id)
ON CONFLICT (appointment_id)
  DO UPDATE SET expires_at = now() + interval '30 days'
RETURNING token
```

Returns: `{ token, url: "${process.env.NEXT_PUBLIC_SITE_URL}/espace-client/acces/${token}" }`

---

## 6. Pages

### `/espace-client` — Login page
- Email input + "Recevoir mon lien de connexion" button
- On submit: POST to `/api/client/auth/magic-link`
- Success state: "Un lien de connexion a été envoyé à [email]. Vérifiez vos emails."
- `?error=not_found` state: "Aucun compte trouvé pour cet email. Contactez le salon."
- `?error=expired` state: "Ce lien a expiré — demandez un nouveau lien" + re-send form (same email input, pre-filled)
- Salon branding (pink header, cream background)

### `/espace-client/dashboard` — Timeline dashboard
Layout B (timeline) — selected during brainstorming:

```
Header: "Bonjour, [name]" | logout button (calls supabase.auth.signOut → /espace-client)
──────────────────────────────────────────────
[+ Prendre un nouveau rendez-vous]  ← pink CTA → /booking
──────────────────────────────────────────────
À VENIR
  [Appointment card — date, service, staff, status badge, cancel button if eligible]
  ...
PASSÉ
  [Appointment card — dimmed, date, service]
  ...
──────────────────────────────────────────────
Footer links: Mes factures | Mes devis | Mon profil
```

**Cancel button eligibility** (shown only when ALL are true):
- `status ∈ {pending, confirmed}`
- `starts_at - now() > 24h` (computed client-side for display; enforced server-side)

Button is **hidden entirely** when ineligible (not disabled/grayed — cleaner UX).

### `/espace-client/appointments/[id]` — Appointment detail
- Full info: service, staff, date/time, status, notes
- Cancel button (same eligibility rules)
- "Retour" link to dashboard

### `/espace-client/devis` — Quotes list
- Table: Référence, Date, Total TTC, Statut
- Status badges (read-only, matching staff dashboard colors)
- Download PDF button (`/api/devis/[id]/pdf`)
- No edit/action buttons — client view is read-only

### `/espace-client/factures` — Invoices list
- Same structure as devis list
- Download PDF button (`/api/factures/[id]/pdf`)
- Paid status shows `paid_at` and payment method

### `/espace-client/profile` — Profile
- Form: Nom, Téléphone
- Email shown as read-only field with note: "Pour modifier votre email, contactez le salon."
- Save → PATCH `/api/client/profile`

### `/espace-client/acces/[token]` — Private token view (no login)
- Shows: service, date/time, staff, status
- Cancel button (same 24h rule — calls `POST /api/client/tokens/[token]/cancel`)
- "Accéder à mon espace client" CTA → `/espace-client`
- If token expired (410 from API): "Ce lien a expiré. Contactez le salon pour obtenir un nouveau lien."
- If token not found (404): "Lien invalide."

---

## 7. Email Templates

Add to `src/lib/email-templates.ts`. All URLs use `process.env.NEXT_PUBLIC_SITE_URL`.

### Booking confirmation (sent to client after `POST /api/appointments`)
```
Subject: Votre rendez-vous est enregistré — Brazilian Studio Rabat
Body:
  Bonjour [name],
  Votre rendez-vous est bien enregistré.

  Service : [service name]
  Date    : [DD/MM/YYYY à HH:MM]
  Avec    : [staff name] (ou "à confirmer")

  Gérer votre rendez-vous :
  [NEXT_PUBLIC_SITE_URL/espace-client/acces/TOKEN]
```

### Booking cancelled (sent when client or staff cancels)
```
Subject: RDV annulé — Brazilian Studio Rabat
Body: Date + service + "Votre rendez-vous a été annulé. Contactez-nous pour reprendre."
```

### Magic link (Supabase custom email template — configured in Supabase Dashboard)
```
Subject: Connexion à votre espace client — Brazilian Studio Rabat
Body: "Cliquez sur le lien ci-dessous pour accéder à votre espace client (valable 1h) :
       {{ .ConfirmationURL }}"
```

**Note:** "Booking confirmed" email (when staff confirms a pending appointment) is out of V4 scope — the trigger would live in a future staff action route.

---

## 8. Staff Dashboard Addition

In the appointment detail view (calendar or list), add a **"Lien privé"** button per appointment:
- Calls `POST /api/client/tokens` → upserts token (ON CONFLICT refreshes expiry)
- Copies the URL to clipboard
- Shows "Lien copié !" toast for 2s

---

## 9. Booking Flow Update (`POST /api/appointments`)

Two additions to the existing handler:

**1. Generate token at booking time:**
```ts
const { data: tokenRow } = await supabase
  .from('booking_tokens')
  .insert({ client_id: client.id, appointment_id: newAppointment.id })
  .select('token')
  .single()
```

**2. Send confirmation email to client (non-blocking):**
```ts
if (client.email && tokenRow) {
  resend.emails.send({
    from: 'onboarding@resend.dev',
    to: [client.email],
    ...bookingConfirmationEmail({
      clientName: client.name,
      serviceName: service.name,
      date: newAppointment.date,
      startTime: newAppointment.start_time,
      staffName: staff?.name ?? null,
      token: tokenRow.token,
    }),
  }).catch(err => console.error('Booking confirmation email failed:', err))
}
```

---

## 10. Security Notes

- `get_client_id()` is `SECURITY DEFINER STABLE` — safe for use in RLS policies
- `get_client_id()` returns NULL for any user with no `clients` row — all client policies evaluate to false, no data leak possible
- Private tokens: `gen_random_bytes(24)` = 192 bits entropy — unguessable via brute force
- Token valid for **30 days** (intentionally longer than magic link's 1h) — clients may click the link in their confirmation email days after booking
- Cancel endpoint verifies `appointment.client_id === authenticated client.id` before acting
- Token cancel verifies token → appointment ownership via DB join — no auth bypass possible
- Client auth is entirely separate from staff auth — no role confusion possible
- Client RLS policies only allow SELECT (read-only) — no client can INSERT/UPDATE/DELETE via browser
- All mutations (cancel, profile update) go through API routes with explicit ownership checks

---

## 11. Migration File

New file: `supabase/migrations/004_client_portal.sql`

Contains (in order):
1. `ALTER TABLE appointments ADD COLUMN starts_at` (generated column)
2. `get_client_id()` function
3. `CREATE TABLE booking_tokens` (with UNIQUE on appointment_id)
4. RLS policy: `clients can view own profile` (on `clients` table)
5. RLS policy: `clients can view own appointments`
6. RLS policies: `clients can view own devis` + `clients can view own devis_items`
7. RLS policies: `clients can view own factures` + `clients can view own facture_items`

---

## 12. New Dependencies

None — Supabase PKCE magic links and Resend are already integrated. `@supabase/ssr` is already installed (used by existing server clients).
