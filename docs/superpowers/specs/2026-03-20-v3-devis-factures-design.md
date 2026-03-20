# Brazilian Studio — V3 Devis & Factures Design

**Date:** 2026-03-20
**Scope:** V3 — Quote and Invoice generation (Devis & Factures)
**Status:** Draft
**Depends on:** V1 spec (2026-03-19-salon-management-design.md), V2 spec (2026-03-20-v2-products-inventory-design.md)

---

## 1. Overview

V3 adds professional quote (devis) and invoice (facture) generation to the Brazilian Studio Rabat dashboard. Staff can create quotes with line items (services and/or products), send them to clients as PDFs via email, convert accepted quotes into invoices, and mark invoices as paid. All documents carry sequential reference numbers and include full TVA breakdown.

**Key constraints:**
- All amounts in MAD (Moroccan Dirham)
- TVA computed server-side only — never trusted from frontend
- Documents with status beyond `draft` are immutable (no edits)
- Sequential references: `DEV-YYYY-NNN` and `FAC-YYYY-NNN`, reset each year
- PDF generated via `@react-pdf/renderer` in a Next.js API route

---

## 2. Architecture

Same hybrid architecture as V1/V2:
- **Reads:** Browser → Supabase client directly (RLS enforced)
- **Writes:** Browser → Next.js API routes → Supabase (service_role key)
- **PDF generation:** Next.js API route streams PDF using `@react-pdf/renderer`
- **Email:** Resend (existing client) — PDF attached, sent to client email (overridable)
- **Auth:** Same staff auth — all `/dashboard/*` routes protected by middleware

---

## 3. Database Schema

### `devis`
```sql
CREATE TABLE devis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,           -- DEV-2026-001
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  valid_until    date,
  events         jsonb NOT NULL DEFAULT '[]',    -- status timeline [{at, by, status}]
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### `devis_items`
```sql
CREATE TABLE devis_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id    uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order  integer NOT NULL DEFAULT 0
);
```

### `factures`
```sql
CREATE TABLE factures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,           -- FAC-2026-001
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  devis_id       uuid REFERENCES devis(id) ON DELETE SET NULL,  -- nullable; set if converted
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','paid','cancelled')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  paid_at        timestamptz,
  paid_amount    numeric(10,2),                  -- supports partial payment tracking later
  payment_method text CHECK (payment_method IN ('cash','card','transfer')),
  events         jsonb NOT NULL DEFAULT '[]',    -- status timeline [{at, by, status}]
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### `facture_items`
```sql
CREATE TABLE facture_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id   uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  description  text NOT NULL,
  quantity     numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price   numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order   integer NOT NULL DEFAULT 0
);
```

### Numbering Functions
```sql
CREATE OR REPLACE FUNCTION generate_devis_number()
RETURNS text AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  n  integer;
BEGIN
  SELECT COUNT(*) + 1 INTO n
  FROM devis
  WHERE number LIKE 'DEV-' || yr || '-%';
  RETURN 'DEV-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_facture_number()
RETURNS text AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  n  integer;
BEGIN
  SELECT COUNT(*) + 1 INTO n
  FROM factures
  WHERE number LIKE 'FAC-' || yr || '-%';
  RETURN 'FAC-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Totals (always computed server-side, never stored)
```
subtotal_ht  = Σ (quantity × unit_price)
tva_amount   = subtotal_ht × tva_rate / 100
total_ttc    = subtotal_ht + tva_amount
```

### RLS Policies
```sql
ALTER TABLE devis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage devis"         ON devis         FOR ALL USING (is_staff());
CREATE POLICY "staff can manage devis_items"   ON devis_items   FOR ALL USING (is_staff());
CREATE POLICY "staff can manage factures"      ON factures      FOR ALL USING (is_staff());
CREATE POLICY "staff can manage facture_items" ON facture_items FOR ALL USING (is_staff());
```

---

## 4. API Routes

All routes are staff-only (verified via `requireStaff()` pattern from V2).

### Devis

#### `POST /api/devis`
Create a new devis.

**Request body:**
```json
{
  "client_id": "uuid",
  "appointment_id": "uuid-or-null",
  "tva_rate": 20.00,
  "notes": "optional",
  "valid_until": "2026-04-20",
  "items": [
    { "description": "Lissage brésilien", "quantity": 1, "unit_price": 650.00 },
    { "description": "OPI Nail Polish", "quantity": 2, "unit_price": 120.00 }
  ]
}
```

**Logic:**
1. Generate `number` via `generate_devis_number()`
2. Validate items non-empty, all required fields present
3. Insert devis row + devis_items rows
4. Append initial event to `events`: `{ at: now(), by: staff_id, status: 'draft' }`
5. Return `201` with full devis + items + computed totals

#### `GET /api/devis`
List all devis with optional filters.

**Query params:** `status`, `client_id`, `from`, `to`, `search` (matches number or client name)

**Response:** Array ordered by `created_at DESC`, each including client name, computed totals.

#### `GET /api/devis/[id]`
Fetch single devis with items and computed totals.

#### `PATCH /api/devis/[id]`
Update devis. **Only allowed when `status = 'draft'`.**

**Allowed fields:** `notes`, `valid_until`, `tva_rate`, `items` (full replacement of items array)

**Returns:** `422` if not draft. `200` with updated devis.

#### `DELETE /api/devis/[id]`
Hard delete. **Only allowed when `status = 'draft'`.**
Returns `409` with `{ error: 'not_draft' }` if status ≠ draft.

#### `POST /api/devis/[id]/send`
Email PDF to client. Sets `status → sent`.

**Request body (optional):**
```json
{ "email": "override@email.com" }
```

Uses client's email if no override. Appends event to `events`. Returns `200`.

#### `POST /api/devis/[id]/convert`
Convert accepted devis to a facture.

**Logic:**
1. Set devis `status → accepted`, append event
2. Generate new facture number via `generate_facture_number()`
3. Create facture with `devis_id` link, same client, same items
4. Return `201` with created facture

#### `POST /api/devis/[id]/duplicate`
Create a new draft devis with same client and items (new number, status = draft).
Returns `201` with new devis.

#### `GET /api/devis/[id]/pdf`
Generate and stream PDF as `application/pdf`.

---

### Factures

#### `POST /api/factures`
Create a facture directly (not from devis). Same structure as POST /api/devis.

#### `GET /api/factures`
List factures. Same filter params as GET /api/devis. Response includes revenue summary:
```json
{
  "items": [...],
  "summary": { "subtotal_ht": 0, "tva_amount": 0, "total_ttc": 0 }
}
```

#### `GET /api/factures/[id]`
Fetch single facture with items and computed totals.

#### `PATCH /api/factures/[id]`
Update. **Only allowed when `status = 'draft'`.**

#### `DELETE /api/factures/[id]`
Hard delete. **Only allowed when `status = 'draft'`.**

#### `POST /api/factures/[id]/send`
Email PDF to client. Sets `status → sent`. Same optional email override.

#### `POST /api/factures/[id]/mark-paid`
Mark invoice as paid.

**Request body:**
```json
{
  "payment_method": "cash",
  "paid_amount": 1430.00
}
```

Sets `status → paid`, `paid_at → now()`, appends event. Returns `200`.

#### `GET /api/factures/[id]/pdf`
Generate and stream PDF.

---

## 5. Dashboard Pages

### `/dashboard/devis`
Devis list.

**Features:**
- Search by reference or client name
- Filter by status + date range
- Table columns: Référence, Client, Date, Total TTC, Statut, Actions
- Inline actions per row: Download PDF (icon), Send (icon), Convert to facture (icon), Duplicate (icon), Delete (icon — draft only)
- Status badges: draft (gray), sent (blue), accepted (green), rejected (red), expired (orange)

### `/dashboard/devis/new`
Create devis form.

**Features:**
- Client selector (searchable)
- Optional: link to appointment
- TVA rate field (default 20%)
- Valid until date picker
- Line items builder: add from services/products catalog OR free-text; each row: description, qty, unit_price HT, total HT (computed live)
- Live totals preview: HT / TVA / TTC
- Notes textarea
- Auto-save draft (debounced 1s)
- Submit → creates devis, redirects to detail page

### `/dashboard/devis/[id]`
Devis detail.

**Features:**
- Status timeline (events JSONB rendered as timeline)
- Edit button (draft only) — opens inline edit mode
- Action buttons: Send, Convert to facture (with confirmation modal), Duplicate, Download PDF, Delete (with confirmation modal, draft only)
- Totals displayed: HT / TVA / TTC
- Read-only view for non-draft documents

### `/dashboard/factures`
Same pattern as devis list. Inline actions add: Mark as Paid (icon). Revenue summary bar at top: Total HT / Total TVA / Total TTC for filtered period.

### `/dashboard/factures/new`
Same as devis/new + payment_method field.

### `/dashboard/factures/[id]`
Same as devis/[id] + Mark as Paid button (opens modal: payment_method + paid_amount).

---

## 6. PDF Template

**Library:** `@react-pdf/renderer`

**Both documents share this layout:**

```
┌──────────────────────────────────────────────────────┐
│  DEVIS / FACTURE  (bold, large)                       │
├───────────────────────────┬──────────────────────────┤
│  Brazilian Studio Rabat   │  Réf: DEV-2026-001        │
│  [Address]                │  Date: 20/03/2026         │
│  [Phone]                  │  Statut: Brouillon        │
│  ICE: XXXXXXXX            │                           │
│  IF: XXXXXXXX             │                           │
├───────────────────────────┴──────────────────────────┤
│  Client: [Name] — [Phone] — [Email]                   │
├──────────────────────────────────────────────────────┤
│  Description        │ Qté │ Prix HT │ TVA % │ Total HT│
│  ─────────────────────────────────────────────────── │
│  Lissage brésilien  │  1  │ 650 MAD │  20%  │ 650 MAD │
│  OPI Nail Polish    │  2  │ 120 MAD │  20%  │ 240 MAD │
├──────────────────────────────────────────────────────┤
│                          Sous-total HT:   890,00 MAD │
│                          TVA (20 %):      178,00 MAD │
│                          Total TTC:     1 068,00 MAD │
├──────────────────────────────────────────────────────┤
│  [Notes]                                              │
│  Devis only: Ce devis est valable jusqu'au [date]     │
│  Facture only: Statut: Payée | Mode: Espèces | ...    │
├──────────────────────────────────────────────────────┤
│  Merci de votre confiance — Brazilian Studio Rabat    │
│                                        Réf: FAC-...  │
└──────────────────────────────────────────────────────┘
```

**Styling:** White background, salon pink (#B76E79) for header accents and table header row, dark gray text, MAD currency on all amounts. Clean sans-serif (Helvetica). Multi-page safe: totals always render at end of items, footer repeated on each page.

---

## 7. Email Templates

### Devis sent to client
**Subject:** `Votre devis — Brazilian Studio Rabat (${number})`
**Body:** Greeting, devis reference and total TTC, PDF attached, validity date.

### Facture sent to client
**Subject:** `Votre facture — Brazilian Studio Rabat (${number})`
**Body:** Greeting, facture reference and total TTC, PDF attached, payment instructions.

Both added to `src/lib/email-templates.ts` following the existing pattern.

---

## 8. Navigation Updates

Add to sidebar in `src/app/dashboard/layout.tsx`:
- **Devis** (icon: FileText) → `/dashboard/devis`
- **Factures** (icon: Receipt) → `/dashboard/factures`

---

## 9. Tech Stack (additions to V2)

New dependency:
- `@react-pdf/renderer` — PDF generation in API routes

No other new dependencies needed.

---

## 10. Migration File

New file: `supabase/migrations/003_devis_factures.sql`

Contains:
1. `generate_devis_number()` function
2. `generate_facture_number()` function
3. `CREATE TABLE devis`
4. `CREATE TABLE devis_items`
5. `CREATE TABLE factures`
6. `CREATE TABLE facture_items`
7. RLS policies for all 4 tables

---

## 11. Security Notes

- `tva_rate`, `subtotal_ht`, `tva_amount`, `total_ttc` always computed server-side
- Documents beyond `draft` status are immutable — enforced in API routes (not DB constraints)
- PDF route requires staff auth — PDFs are never publicly accessible
- Client email override in `/send` routes requires staff auth
