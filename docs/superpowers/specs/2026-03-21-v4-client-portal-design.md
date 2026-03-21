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
- Emails non-blocking (fire-and-forget, same pattern as low-stock alerts)
- Token generated at booking time, never lazily

---

## 2. Architecture

Same hybrid pattern as V1–V3:
- **Reads:** Browser → Supabase client directly (RLS enforced)
- **Writes:** Browser → Next.js API routes → Supabase (service_role key)
- **Auth:** Supabase magic link for clients; separate from staff auth
- **Email:** Resend (existing client)

**Middleware update:** Extend `src/middleware.ts` to protect `/espace-client/*` routes, allowing public access to `/espace-client` (login) and `/espace-client/acces/*` (token pages).

---

## 3. Database Schema

### `booking_tokens`
```sql
CREATE TABLE booking_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
-- No client RLS needed — accessed via service_role in API routes only
```

### Helper function
```sql
CREATE OR REPLACE FUNCTION get_client_id()
RETURNS uuid AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### New RLS policies (clients reading own data)
```sql
-- Appointments
CREATE POLICY "clients can view own appointments"
  ON appointments FOR SELECT
  USING (client_id = get_client_id());

-- Devis
CREATE POLICY "clients can view own devis"
  ON devis FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis_items"
  ON devis_items FOR SELECT
  USING (devis_id IN (SELECT id FROM devis WHERE client_id = get_client_id()));

-- Factures
CREATE POLICY "clients can view own factures"
  ON factures FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own facture_items"
  ON facture_items FOR SELECT
  USING (facture_id IN (SELECT id FROM factures WHERE client_id = get_client_id()));
```

### `clients` table (no schema change)
`auth_user_id` already exists. On first magic-link login, the API matches the Supabase user by email to an existing `clients` row and writes `auth_user_id`.

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

All client API routes under `/api/client/*`. Staff-facing routes under `/api/` are unchanged.

### `POST /api/client/auth/magic-link`
Send magic link email.

**Request body:**
```json
{ "email": "client@example.com" }
```

**Logic:**
1. Call `supabase.auth.signInWithOtp({ email })` — Supabase sends the magic link
2. Email subject: `Connexion à votre espace client — Brazilian Studio Rabat`
3. Redirect URL: `/espace-client/dashboard`
4. Returns `200` always (don't reveal whether email exists)

### `GET /api/client/auth/callback`
Supabase OAuth callback handler. Exchanges code for session, then:
1. Look up `clients` row by email — if `auth_user_id` is null, set it to `auth.uid()`
2. If no client row found → redirect to `/espace-client?error=not_found` with message "Aucun compte trouvé pour cet email. Contactez le salon."
3. Redirect to `/espace-client/dashboard`

### `GET /api/client/appointments`
Returns client's appointments ordered by `starts_at DESC`.

**Query params:** `status` (upcoming | past | all, default: all)

**Response:** Array of appointments with `service: { name, color }` and `staff: { name } | null`

### `POST /api/client/appointments/[id]/cancel`
Cancel an appointment.

**Auth:** Requires authenticated client who owns the appointment.

**Logic:**
```
1. Fetch appointment — verify client_id matches authenticated client
2. If status === 'cancelled' → return 200 (idempotent no-op)
3. If !['pending', 'confirmed'].includes(status) → 422 { error: 'invalid_status' }
4. If (appointment.starts_at.getTime() - Date.now()) < 24 * 60 * 60 * 1000 → 422 { error: 'too_late_to_cancel' }
   (both sides UTC — server computes this, no client clock trusted)
5. Update status → 'cancelled'
6. Return 200
7. [async, non-blocking] Send cancellation email to client
8. [async, non-blocking] Insert into notifications table + send email to manager
```

### `GET /api/client/profile`
Returns authenticated client's profile: `{ id, name, phone, email }`.

### `PATCH /api/client/profile`
Update client profile.

**Allowed fields:** `name`, `email`, `phone`

**Logic:**
- Validate name non-empty, phone format, email format
- If email changes: also update `supabase.auth.updateUser({ email })` (triggers Supabase re-confirmation)
- Returns `200` with updated profile

### `GET /api/client/tokens/[token]`
Resolve private token → booking data (no auth required).

**Logic:**
1. Look up token in `booking_tokens`
2. If not found → 404
3. If `expires_at < now()` → 410 `{ error: 'token_expired' }`
4. Return appointment + client name + service name

### `POST /api/client/tokens` (staff-only)
Generate a private token for an appointment (called from staff dashboard).

**Auth:** Requires staff.

**Request body:** `{ appointment_id: "uuid" }`

**Logic:** Insert into `booking_tokens`, return `{ token, url: "https://..." }`

---

## 6. Pages

### `/espace-client` — Login page
- Email input + "Recevoir mon lien de connexion" button
- On submit: POST to `/api/client/auth/magic-link`
- Success state: "Un lien de connexion a été envoyé à [email]. Vérifiez vos emails."
- Expired link error state: "Ce lien a expiré — demandez un nouveau lien" with re-send form
- Error state for unknown email: "Aucun compte trouvé. Contactez le salon."
- Salon branding (pink header, cream background)

### `/espace-client/dashboard` — Timeline dashboard
Layout B (timeline) — selected during brainstorming:

```
Header: "Bonjour, [name]" + logout
─────────────────────────────
[+ Prendre un nouveau rendez-vous]  ← pink CTA button
─────────────────────────────
À VENIR
  [Appointment card — date, service, staff, status badge, cancel button if eligible]
  ...
PASSÉ
  [Appointment card — dimmed, date, service]
  ...
─────────────────────────────
Footer links: Mes factures | Mes devis | Mon profil
```

Cancel button shown only when: `status ∈ {pending, confirmed}` AND `starts_at - now() > 24h`. Otherwise hidden (not grayed — hidden entirely to avoid confusion).

### `/espace-client/appointments/[id]` — Appointment detail
- Full appointment info: service, staff, date/time, status, notes
- Cancel button (same eligibility rules as dashboard)
- "Retour" link to dashboard

### `/espace-client/devis` — Quotes list
- Table: Référence, Date, Total TTC, Statut
- Status badges matching staff dashboard colors
- Download PDF button (links to `/api/devis/[id]/pdf`) — **read-only, no actions**
- "Retour" link to dashboard

### `/espace-client/factures` — Invoices list
- Same structure as devis list
- Download PDF button (links to `/api/factures/[id]/pdf`)
- Paid status shows `paid_at` and payment method

### `/espace-client/profile` — Profile
- Form: Nom, Téléphone, Email
- Save button → PATCH `/api/client/profile`
- Email change warning: "Un email de confirmation sera envoyé à votre nouvelle adresse"

### `/espace-client/acces/[token]` — Private token view (no login)
- Shows single appointment: service, date/time, staff, status
- Cancel button (same 24h rule — calls public cancel endpoint with token auth)
- "Créer un compte" CTA linking to `/espace-client` (login)
- If token expired: "Ce lien a expiré. Contactez le salon pour obtenir un nouveau lien."

---

## 7. Email Templates

Add to `src/lib/email-templates.ts`:

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
  [https://domain.com/espace-client/acces/TOKEN]

  Brazilian Studio Rabat
```

### Booking confirmed (sent when staff confirms)
```
Subject: RDV confirmé — Brazilian Studio Rabat
Body: Same structure + "Votre rendez-vous a été confirmé. À bientôt !"
```

### Booking cancelled (sent when client cancels)
```
Subject: RDV annulé — Brazilian Studio Rabat
Body: Date + service + "Votre rendez-vous a été annulé. Contactez-nous pour reprendre."
```

### Magic link (handled by Supabase, custom template)
```
Subject: Connexion à votre espace client — Brazilian Studio Rabat
Body: "Cliquez sur le lien ci-dessous pour accéder à votre espace client (valable 1h) : [LINK]"
```

---

## 8. Staff Dashboard Addition

In `src/app/dashboard/calendar/` appointment detail view (or appointment list), add:

**"Lien privé"** button per appointment:
- Calls `POST /api/client/tokens` → generates/retrieves token
- Copies `https://domain.com/espace-client/acces/[token]` to clipboard
- Shows "Lien copié !" toast for 2s

---

## 9. Booking Flow Update

`src/app/api/appointments/route.ts` (POST handler) gets two additions:

1. **Generate booking token** immediately after inserting appointment:
   ```ts
   await supabase.from('booking_tokens').insert({ client_id, appointment_id: newAppointment.id })
   ```

2. **Send confirmation email to client** (non-blocking, fire-and-forget):
   ```ts
   if (client.email) {
     resend.emails.send({ ... bookingConfirmationEmail(...) ... })
       .catch(err => console.error('Booking confirmation email failed:', err))
   }
   ```

---

## 10. Security Notes

- `get_client_id()` is `SECURITY DEFINER STABLE` — safe for RLS use
- Private tokens use `gen_random_bytes(24)` — 192 bits of entropy, unguessable
- Cancel endpoint verifies `client_id` matches authenticated client before acting
- Token-based cancel (no auth) also verifies token → appointment ownership
- Magic link expiry handled by Supabase (1h default)
- Client auth is entirely separate from staff auth — no role confusion possible
- Client can only read their own data — RLS enforced at DB level

---

## 11. Migration File

New file: `supabase/migrations/004_client_portal.sql`

Contains:
1. `get_client_id()` function
2. `CREATE TABLE booking_tokens`
3. RLS policies for clients on `appointments`, `devis`, `devis_items`, `factures`, `facture_items`

---

## 12. New Dependencies

None — Supabase magic links and Resend are already integrated.
