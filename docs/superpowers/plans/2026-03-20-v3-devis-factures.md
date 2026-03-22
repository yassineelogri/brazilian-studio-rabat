# V3 Devis & Factures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add professional quote (devis) and invoice (facture) generation with PDF export and email delivery to Brazilian Studio Rabat's dashboard.

**Architecture:** Same hybrid as V1/V2 — reads go browser→Supabase (RLS), writes go browser→API routes→Supabase (service_role). PDF generated server-side via `@react-pdf/renderer` inside Next.js API routes. Amounts always in MAD, TVA always computed server-side.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase PostgreSQL, `@react-pdf/renderer`, Resend (existing), Tailwind CSS, lucide-react.

---

## File Map

**New files:**
- `supabase/migrations/003_devis_factures.sql` — 4 tables + numbering functions + RLS
- `src/lib/api-helpers.ts` — shared `requireStaff()` + `computeTotals()` (DRY; V3 routes import from here)
- `src/components/pdf/DocumentTemplate.tsx` — shared PDF layout for devis + factures
- `src/app/api/devis/route.ts` — GET list + POST create
- `src/app/api/devis/[id]/route.ts` — GET single + PATCH + DELETE
- `src/app/api/devis/[id]/send/route.ts`
- `src/app/api/devis/[id]/reject/route.ts`
- `src/app/api/devis/[id]/convert/route.ts`
- `src/app/api/devis/[id]/duplicate/route.ts`
- `src/app/api/devis/[id]/pdf/route.ts`
- `src/app/api/factures/route.ts` — GET list (+ summary) + POST create
- `src/app/api/factures/[id]/route.ts` — GET single + PATCH + DELETE
- `src/app/api/factures/[id]/send/route.ts`
- `src/app/api/factures/[id]/mark-paid/route.ts`
- `src/app/api/factures/[id]/cancel/route.ts`
- `src/app/api/factures/[id]/pdf/route.ts`
- `src/components/dashboard/LineItemsBuilder.tsx` — shared line items UI (devis + factures)
- `src/app/dashboard/devis/page.tsx` — list with filters + inline actions
- `src/app/dashboard/devis/new/page.tsx` — create form with auto-save
- `src/app/dashboard/devis/[id]/page.tsx` — detail + edit + status timeline
- `src/app/dashboard/factures/page.tsx`
- `src/app/dashboard/factures/new/page.tsx`
- `src/app/dashboard/factures/[id]/page.tsx`

**Modified files:**
- `next.config.mjs` — add `serverComponentsExternalPackages: ['@react-pdf/renderer']`
- `src/lib/supabase/types.ts` — add Devis, DevisItem, Facture, FactureItem types
- `src/lib/email-templates.ts` — add `devisEmail()` + `factureEmail()`
- `src/app/dashboard/layout.tsx` — add Devis + Factures nav items

---

## Task 1: Install dependency + update config + run migration

**Files:**
- Modify: `next.config.mjs`
- Create: `supabase/migrations/003_devis_factures.sql`

- [ ] **Step 1: Install @react-pdf/renderer**

Working directory: `C:/Users/yassi/.gemini/antigravity/scratch/brazilian_studio/.worktrees/feature/v1-appointments`

```bash
npm install @react-pdf/renderer
npm install --save-dev @types/react-pdf
```

Note: `@types/react-pdf` may not exist — that's fine, `@react-pdf/renderer` ships its own types. If the second command errors, skip it.

- [ ] **Step 2: Update next.config.mjs**

Current file:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  experimental: { optimizeCss: false },
}
export default nextConfig
```

Replace the `experimental` block:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  experimental: {
    optimizeCss: false,
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
}
export default nextConfig
```

- [ ] **Step 3: Write migration file**

Create `supabase/migrations/003_devis_factures.sql`:

```sql
-- ============================================================
-- V3: Devis & Factures
-- ============================================================

-- Numbering functions (defined before tables so they can be
-- called during INSERT; they only reference existing tables)

CREATE OR REPLACE FUNCTION generate_devis_number()
RETURNS text AS $$
DECLARE
  yr   text := to_char(now(), 'YYYY');
  last text;
  n    integer;
BEGIN
  SELECT MAX(split_part(number, '-', 3)) INTO last
  FROM devis
  WHERE number LIKE 'DEV-' || yr || '-%';
  n := COALESCE(last::integer, 0) + 1;
  RETURN 'DEV-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_facture_number()
RETURNS text AS $$
DECLARE
  yr   text := to_char(now(), 'YYYY');
  last text;
  n    integer;
BEGIN
  SELECT MAX(split_part(number, '-', 3)) INTO last
  FROM factures
  WHERE number LIKE 'FAC-' || yr || '-%';
  n := COALESCE(last::integer, 0) + 1;
  RETURN 'FAC-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tables

CREATE TABLE devis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','accepted','rejected')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  valid_until    date,
  events         jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devis_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id    uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE factures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  devis_id       uuid REFERENCES devis(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','paid','cancelled')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  paid_at        timestamptz,
  paid_amount    numeric(10,2),
  payment_method text CHECK (payment_method IN ('cash','card','transfer')),
  events         jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE facture_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id  uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order  integer NOT NULL DEFAULT 0
);

-- RLS

ALTER TABLE devis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage devis"         ON devis         FOR ALL USING (is_staff());
CREATE POLICY "staff can manage devis_items"   ON devis_items   FOR ALL USING (is_staff());
CREATE POLICY "staff can manage factures"      ON factures      FOR ALL USING (is_staff());
CREATE POLICY "staff can manage facture_items" ON facture_items FOR ALL USING (is_staff());
```

**Important:** `expired` is NOT a valid DB status value — the CHECK constraint intentionally excludes it. `expired` is a computed projection returned by GET routes when `status = 'sent' AND valid_until < CURRENT_DATE`. The DB always stores `sent`.

- [ ] **Step 4: Run migration in Supabase dashboard**

Go to Supabase → SQL Editor → paste the migration file → Run. Verify the 4 tables appear in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs supabase/migrations/003_devis_factures.sql package.json package-lock.json
git commit -m "feat(v3): install @react-pdf/renderer, add devis+factures migration"
```

---

## Task 2: TypeScript types + shared API helpers

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Create: `src/lib/api-helpers.ts`

- [ ] **Step 1: Add types to src/lib/supabase/types.ts**

Add after the `ProductSaleWithRelations` interface (before the `DBRelationship` type):

```typescript
export type DevisStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type FactureStatus = 'draft' | 'sent' | 'paid' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer'

export interface StatusEvent {
  at: string    // ISO timestamp
  by: string    // staff id
  status: string
}

export interface DevisItem {
  [key: string]: unknown
  id: string
  devis_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Devis {
  [key: string]: unknown
  id: string
  number: string
  client_id: string
  appointment_id: string | null
  status: DevisStatus
  tva_rate: number
  notes: string | null
  valid_until: string | null
  events: StatusEvent[]
  created_at: string
}

export interface DevisWithRelations extends Devis {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  items: DevisItem[]
  subtotal_ht: number
  tva_amount: number
  total_ttc: number
}

export interface FactureItem {
  [key: string]: unknown
  id: string
  facture_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface Facture {
  [key: string]: unknown
  id: string
  number: string
  client_id: string
  devis_id: string | null
  appointment_id: string | null
  status: FactureStatus
  tva_rate: number
  notes: string | null
  paid_at: string | null
  paid_amount: number | null
  payment_method: PaymentMethod | null
  events: StatusEvent[]
  created_at: string
}

export interface FactureWithRelations extends Facture {
  clients: Pick<Client, 'name' | 'phone' | 'email'>
  items: FactureItem[]
  subtotal_ht: number
  tva_amount: number
  total_ttc: number
}
```

Also update the `Database` type — add to the `Tables` object:

```typescript
devis:         { Row: Devis;       Insert: Omit<Devis, 'id' | 'created_at'>;        Update: Partial<Omit<Devis, 'id'>>;        Relationships: DBRelationship[] }
devis_items:   { Row: DevisItem;   Insert: Omit<DevisItem, 'id'>;                    Update: Partial<Omit<DevisItem, 'id'>>;    Relationships: DBRelationship[] }
factures:      { Row: Facture;     Insert: Omit<Facture, 'id' | 'created_at'>;       Update: Partial<Omit<Facture, 'id'>>;      Relationships: DBRelationship[] }
facture_items: { Row: FactureItem; Insert: Omit<FactureItem, 'id'>;                  Update: Partial<Omit<FactureItem, 'id'>>; Relationships: DBRelationship[] }
```

- [ ] **Step 2: Create src/lib/api-helpers.ts**

```typescript
import { createAnonSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Verify the caller is an authenticated, active staff member.
 * Returns { id } or null.
 * V3 API routes import from here instead of duplicating this logic.
 */
export async function requireStaff(): Promise<{ id: string } | null> {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  return data ?? null
}

/**
 * Compute HT/TVA/TTC totals from line items.
 * Always called server-side — never trust frontend totals.
 */
export function computeTotals(
  items: Array<{ quantity: number | string; unit_price: number | string }>,
  tva_rate: number | string
): { subtotal_ht: number; tva_amount: number; total_ttc: number } {
  const subtotal_ht = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  )
  const tva_amount = subtotal_ht * Number(tva_rate) / 100
  const total_ttc = subtotal_ht + tva_amount
  return {
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    tva_amount:  Math.round(tva_amount  * 100) / 100,
    total_ttc:   Math.round(total_ttc   * 100) / 100,
  }
}

/**
 * Apply the expired projection: if status is 'sent' and valid_until < today,
 * return 'expired' — but never store it in the DB.
 */
export function projectDevisStatus(
  status: string,
  valid_until: string | null
): string {
  if (status === 'sent' && valid_until) {
    const today = new Date().toISOString().slice(0, 10)
    if (valid_until < today) return 'expired'
  }
  return status
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to V3).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/api-helpers.ts
git commit -m "feat(v3): add Devis/Facture types and shared API helpers"
```

---

## Task 3: Email templates + PDF DocumentTemplate component

**Files:**
- Modify: `src/lib/email-templates.ts`
- Create: `src/components/pdf/DocumentTemplate.tsx`

- [ ] **Step 1: Add email templates to src/lib/email-templates.ts**

Append to the end of the file:

```typescript
export function devisEmail(data: {
  clientName: string
  number: string
  totalTtc: number
  validUntil: string | null
}) {
  const validity = data.validUntil
    ? `<p>Ce devis est valable jusqu'au <strong>${data.validUntil}</strong>.</p>`
    : ''
  return {
    subject: `Votre devis — Brazilian Studio Rabat (${data.number})`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Votre devis — ${data.number}</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Veuillez trouver ci-joint votre devis pour un montant total de <strong>${data.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD TTC</strong>.</p>
        ${validity}
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}

export function factureEmail(data: {
  clientName: string
  number: string
  totalTtc: number
}) {
  return {
    subject: `Votre facture — Brazilian Studio Rabat (${data.number})`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">Votre facture — ${data.number}</h2>
        <p>Bonjour ${data.clientName},</p>
        <p>Veuillez trouver ci-joint votre facture pour un montant total de <strong>${data.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD TTC</strong>.</p>
        <p>Merci pour votre confiance. Nous restons à votre disposition pour tout renseignement.</p>
        <p style="color: #999; font-size: 14px;">Brazilian Studio Rabat</p>
      </div>
    `,
  }
}
```

- [ ] **Step 2: Create src/components/pdf/DocumentTemplate.tsx**

```tsx
import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { DevisWithRelations, FactureWithRelations } from '@/lib/supabase/types'

const PINK = '#B76E79'
const DARK = '#1a1a1a'
const GRAY = '#666666'
const LIGHT = '#f8f4f4'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  // ---- Header ----
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: PINK, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { flex: 1 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 3 },
  companyLine: { color: GRAY, marginBottom: 2 },
  refLabel: { color: GRAY },
  refValue: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  // ---- Client section ----
  clientBox: {
    backgroundColor: LIGHT,
    padding: 10,
    marginBottom: 20,
    borderRadius: 3,
  },
  clientLabel: { color: GRAY, marginBottom: 3 },
  clientName: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  clientLine: { color: GRAY },
  // ---- Table ----
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PINK,
    padding: 6,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8dede',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: LIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8dede',
  },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold' },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTva: { flex: 1, textAlign: 'center' },
  colTotal: { flex: 2, textAlign: 'right' },
  // ---- Totals ----
  totalsSection: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  totalsRow: {
    flexDirection: 'row',
    width: 240,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: { color: GRAY },
  totalsValue: {},
  totalsTTCRow: {
    flexDirection: 'row',
    width: 240,
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: PINK,
  },
  totalsTTCLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PINK },
  totalsTTCValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: PINK },
  // ---- Notes / info ----
  notesBox: {
    backgroundColor: LIGHT,
    padding: 10,
    marginBottom: 16,
    borderRadius: 3,
  },
  notesLabel: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  notesText: { color: GRAY },
  // ---- Footer ----
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e8dede',
    paddingTop: 8,
  },
  footerText: { color: GRAY, fontSize: 8 },
})

function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
  paid: 'Payée',
  cancelled: 'Annulée',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  transfer: 'Virement',
}

interface Props {
  doc: DevisWithRelations | FactureWithRelations
  type: 'devis' | 'facture'
}

export function DocumentTemplate({ doc, type }: Props) {
  const isFacture = type === 'facture'
  const facture = isFacture ? (doc as FactureWithRelations) : null
  const devis = !isFacture ? (doc as DevisWithRelations) : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>

        {/* Header: company left, ref right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>Brazilian Studio Rabat</Text>
            <Text style={styles.companyLine}>Rabat, Maroc</Text>
            <Text style={styles.companyLine}>Tél: +212 600 000 000</Text>
            <Text style={styles.companyLine}>ICE: 000000000000000</Text>
            <Text style={styles.companyLine}>IF: 00000000</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.refLabel}>Référence</Text>
            <Text style={styles.refValue}>{doc.number}</Text>
            <Text style={{ ...styles.refLabel, marginTop: 6 }}>Date</Text>
            <Text>{fmtDate(doc.created_at)}</Text>
            <Text style={{ ...styles.refLabel, marginTop: 6 }}>Statut</Text>
            <Text>{STATUS_LABELS[doc.status] ?? doc.status}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>Client</Text>
          <Text style={styles.clientName}>{doc.clients.name}</Text>
          {doc.clients.phone ? <Text style={styles.clientLine}>{doc.clients.phone}</Text> : null}
          {doc.clients.email ? <Text style={styles.clientLine}>{doc.clients.email}</Text> : null}
        </View>

        {/* Items table */}
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.thText, ...styles.colDesc }}>Description</Text>
          <Text style={{ ...styles.thText, ...styles.colQty }}>Qté</Text>
          <Text style={{ ...styles.thText, ...styles.colPrice }}>Prix HT</Text>
          <Text style={{ ...styles.thText, ...styles.colTva }}>TVA</Text>
          <Text style={{ ...styles.thText, ...styles.colTotal }}>Total HT</Text>
        </View>
        {doc.items.map((item, idx) => (
          <View key={item.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{Number(item.quantity)}</Text>
            <Text style={styles.colPrice}>{fmtAmount(Number(item.unit_price))}</Text>
            <Text style={styles.colTva}>{Number(doc.tva_rate)}%</Text>
            <Text style={styles.colTotal}>{fmtAmount(Number(item.quantity) * Number(item.unit_price))}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text style={styles.totalsValue}>{fmtAmount(doc.subtotal_ht)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVA ({Number(doc.tva_rate)}%)</Text>
            <Text style={styles.totalsValue}>{fmtAmount(doc.tva_amount)}</Text>
          </View>
          <View style={styles.totalsTTCRow}>
            <Text style={styles.totalsTTCLabel}>Total TTC</Text>
            <Text style={styles.totalsTTCValue}>{fmtAmount(doc.total_ttc)}</Text>
          </View>
        </View>

        {/* Notes / devis validity / facture payment */}
        {(doc.notes || devis?.valid_until || facture?.paid_at) ? (
          <View style={styles.notesBox}>
            {doc.notes ? (
              <>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{doc.notes}</Text>
              </>
            ) : null}
            {devis?.valid_until ? (
              <Text style={{ ...styles.notesText, marginTop: doc.notes ? 8 : 0 }}>
                Ce devis est valable jusqu'au {fmtDate(devis.valid_until)}.
              </Text>
            ) : null}
            {facture?.paid_at ? (
              <Text style={{ ...styles.notesText, marginTop: doc.notes ? 8 : 0 }}>
                Payée le {fmtDate(facture.paid_at)}
                {facture.payment_method ? ` — ${PAYMENT_LABELS[facture.payment_method] ?? facture.payment_method}` : ''}
                {facture.paid_amount != null ? ` — ${fmtAmount(Number(facture.paid_amount))}` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Merci de votre confiance — Brazilian Studio Rabat</Text>
          <Text style={styles.footerText}>{doc.number}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email-templates.ts src/components/pdf/DocumentTemplate.tsx
git commit -m "feat(v3): add devis/facture email templates and PDF DocumentTemplate"
```

---

## Task 4: Devis CRUD API routes

**Files:**
- Create: `src/app/api/devis/route.ts`
- Create: `src/app/api/devis/[id]/route.ts`

- [ ] **Step 1: Create src/app/api/devis/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { client_id, appointment_id, tva_rate, notes, valid_until, items } = body

    if (!client_id || typeof client_id !== 'string') {
      return NextResponse.json({ error: 'client_id is required' }, { status: 422 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 422 })
    }
    for (const item of items) {
      if (!item.description || typeof item.description !== 'string' || item.description.trim() === '') {
        return NextResponse.json({ error: 'each item must have a description' }, { status: 422 })
      }
      if (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return NextResponse.json({ error: 'each item quantity must be > 0' }, { status: 422 })
      }
      if (isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) {
        return NextResponse.json({ error: 'each item unit_price must be >= 0' }, { status: 422 })
      }
    }

    const supabase = createServerSupabaseClient()

    // Generate number via RPC
    const { data: numberData, error: numErr } = await supabase.rpc('generate_devis_number')
    if (numErr) throw numErr

    const initialEvent = { at: new Date().toISOString(), by: staff.id, status: 'draft' }

    const { data: devis, error: devisErr } = await supabase
      .from('devis')
      .insert({
        number: numberData as string,
        client_id,
        appointment_id: appointment_id || null,
        tva_rate: tva_rate ?? 20,
        notes: notes?.trim() || null,
        valid_until: valid_until || null,
        events: [initialEvent],
      })
      .select()
      .single()

    if (devisErr) throw devisErr

    const itemRows = items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
      devis_id: devis.id,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      sort_order: idx,
    }))

    const { data: createdItems, error: itemsErr } = await supabase
      .from('devis_items')
      .insert(itemRows)
      .select()

    if (itemsErr) throw itemsErr

    const totals = computeTotals(createdItems!, devis.tva_rate)

    return NextResponse.json({
      ...devis,
      items: createdItems,
      ...totals,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/devis error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status  = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const from    = searchParams.get('from')
    const to      = searchParams.get('to')
    const search  = searchParams.get('search')

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('devis')
      .select(`
        id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
        clients(name, phone, email),
        devis_items(id, description, quantity, unit_price, sort_order)
      `)
      .order('created_at', { ascending: false })

    // status filter: 'expired' is special — filter on sent + valid_until < today
    if (status === 'expired') {
      const today = new Date().toISOString().slice(0, 10)
      query = query.eq('status', 'sent').lt('valid_until', today)
    } else if (status) {
      query = query.eq('status', status)
    }

    if (clientId) query = query.eq('client_id', clientId)
    if (from)     query = query.gte('created_at', from)
    if (to)       query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error

    const result = (data || [])
      .filter((d: any) => {
        if (!search) return true
        const q = search.toLowerCase()
        return d.number.toLowerCase().includes(q) || d.clients?.name?.toLowerCase().includes(q)
      })
      .map((d: any) => {
        const items = (d.devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        const totals = computeTotals(items, d.tva_rate)
        return {
          id: d.id,
          number: d.number,
          status: projectDevisStatus(d.status, d.valid_until),
          tva_rate: d.tva_rate,
          valid_until: d.valid_until,
          notes: d.notes,
          events: d.events,
          created_at: d.created_at,
          client_id: d.client_id,
          appointment_id: d.appointment_id,
          clients: d.clients,
          items,
          ...totals,
        }
      })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/devis error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create src/app/api/devis/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'

async function fetchDevisWithItems(supabase: ReturnType<typeof createServerSupabaseClient>, id: string) {
  const { data, error } = await supabase
    .from('devis')
    .select(`
      id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
      clients(name, phone, email),
      devis_items(id, description, quantity, unit_price, sort_order)
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data, error } = await fetchDevisWithItems(supabase, params.id)
    if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const items = ((data as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, data.tva_rate)

    return NextResponse.json({
      ...data,
      status: projectDevisStatus(data.status, data.valid_until),
      items,
      ...totals,
    })
  } catch (err) {
    console.error('GET /api/devis/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: existing, error: fetchErr } = await supabase
      .from('devis').select('id, status').eq('id', params.id).single()
    if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (existing.status !== 'draft') return NextResponse.json({ error: 'not_draft' }, { status: 409 })

    const body = await request.json()
    const { notes, valid_until, tva_rate, items } = body

    // Build update payload from whitelisted fields only
    const updates: Record<string, unknown> = {}
    if (notes !== undefined)       updates.notes = notes?.trim() || null
    if (valid_until !== undefined) updates.valid_until = valid_until || null
    if (tva_rate !== undefined)    updates.tva_rate = Number(tva_rate)

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase.from('devis').update(updates).eq('id', params.id)
      if (updateErr) throw updateErr
    }

    // Full replacement of items if provided
    if (Array.isArray(items)) {
      if (items.length === 0) return NextResponse.json({ error: 'items must not be empty' }, { status: 422 })
      const { error: delErr } = await supabase.from('devis_items').delete().eq('devis_id', params.id)
      if (delErr) throw delErr
      const itemRows = items.map((item: any, idx: number) => ({
        devis_id: params.id,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        sort_order: idx,
      }))
      const { error: insErr } = await supabase.from('devis_items').insert(itemRows)
      if (insErr) throw insErr
    }

    const { data, error } = await fetchDevisWithItems(supabase, params.id)
    if (error || !data) throw error

    const sortedItems = ((data as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(sortedItems, data.tva_rate)

    return NextResponse.json({ ...data, items: sortedItems, ...totals })
  } catch (err) {
    console.error('PATCH /api/devis/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: existing, error: fetchErr } = await supabase
      .from('devis').select('id, status').eq('id', params.id).single()
    if (fetchErr || !existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (existing.status !== 'draft') return NextResponse.json({ error: 'not_draft' }, { status: 409 })

    const { error } = await supabase.from('devis').delete().eq('id', params.id)
    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/devis/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Run build check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/devis/
git commit -m "feat(v3): add devis CRUD API routes (GET list, POST, GET [id], PATCH, DELETE)"
```

---

## Task 5: Devis action routes

**Files:**
- Create: `src/app/api/devis/[id]/send/route.ts`
- Create: `src/app/api/devis/[id]/reject/route.ts`
- Create: `src/app/api/devis/[id]/convert/route.ts`
- Create: `src/app/api/devis/[id]/duplicate/route.ts`
- Create: `src/app/api/devis/[id]/pdf/route.ts`

- [ ] **Step 1: Create send route**

`src/app/api/devis/[id]/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { devisEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
               clients(name, phone, email), devis_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()

    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(devis.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const emailOverride = body?.email
    const client = (devis as any).clients
    const toEmail = emailOverride || client?.email

    if (!toEmail) return NextResponse.json({ error: 'no_email' }, { status: 422 })

    const items = ((devis as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, devis.tva_rate)
    const docData = { ...devis, status: 'sent', items, ...totals, clients: client }

    // Generate PDF
    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'devis' })
    )

    // Update status + append event
    const newEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'sent' }]
    await supabase.from('devis').update({ status: 'sent', events: newEvents }).eq('id', params.id)

    // Send email
    const template = devisEmail({
      clientName: client?.name ?? 'Client',
      number: devis.number,
      totalTtc: totals.total_ttc,
      validUntil: devis.valid_until,
    })
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [toEmail],
      subject: template.subject,
      html: template.html,
      attachments: [{ filename: `${devis.number}.pdf`, content: buffer }],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/devis/[id]/send error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create reject route**

`src/app/api/devis/[id]/reject/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis').select('id, status, events').eq('id', params.id).single()
    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (devis.status !== 'sent') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })

    const newEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'rejected' }]
    const { error } = await supabase.from('devis').update({ status: 'rejected', events: newEvents }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/devis/[id]/reject error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create convert route**

`src/app/api/devis/[id]/convert/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, status, events, client_id, appointment_id, tva_rate, notes,
               devis_items(description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(devis.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // Mark devis as accepted
    const devisEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'accepted' }]
    await supabase.from('devis').update({ status: 'accepted', events: devisEvents }).eq('id', params.id)

    // Generate facture number
    const { data: factureNumber, error: numErr } = await supabase.rpc('generate_facture_number')
    if (numErr) throw numErr

    const factureEvent = { at: new Date().toISOString(), by: staff.id, status: 'draft' }

    // Create facture
    const { data: facture, error: factureErr } = await supabase
      .from('factures')
      .insert({
        number: factureNumber as string,
        client_id: devis.client_id,
        devis_id: params.id,
        appointment_id: devis.appointment_id,
        tva_rate: devis.tva_rate,
        notes: devis.notes,
        events: [factureEvent],
      })
      .select()
      .single()
    if (factureErr) throw factureErr

    // Copy items
    const itemRows = ((devis as any).devis_items || []).map((item: any) => ({
      facture_id: facture.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order,
    }))
    const { error: itemsErr } = await supabase.from('facture_items').insert(itemRows)
    if (itemsErr) throw itemsErr

    return NextResponse.json(facture, { status: 201 })
  } catch (err) {
    console.error('POST /api/devis/[id]/convert error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create duplicate route**

`src/app/api/devis/[id]/duplicate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: source, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, client_id, appointment_id, tva_rate, notes, valid_until,
               devis_items(description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (fetchErr || !source) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const { data: newNumber, error: numErr } = await supabase.rpc('generate_devis_number')
    if (numErr) throw numErr

    const { data: newDevis, error: devisErr } = await supabase
      .from('devis')
      .insert({
        number: newNumber as string,
        client_id: source.client_id,
        appointment_id: source.appointment_id,
        tva_rate: source.tva_rate,
        notes: source.notes,
        valid_until: source.valid_until,
        events: [{ at: new Date().toISOString(), by: staff.id, status: 'draft' }],
      })
      .select()
      .single()
    if (devisErr) throw devisErr

    const itemRows = ((source as any).devis_items || []).map((item: any) => ({
      devis_id: newDevis.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order,
    }))
    await supabase.from('devis_items').insert(itemRows)

    return NextResponse.json(newDevis, { status: 201 })
  } catch (err) {
    console.error('POST /api/devis/[id]/duplicate error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Create PDF route**

`src/app/api/devis/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error } = await supabase
      .from('devis')
      .select(`id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
               clients(name, phone, email), devis_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (error || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const items = ((devis as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, devis.tva_rate)
    const docData = {
      ...devis,
      status: projectDevisStatus(devis.status, devis.valid_until),
      items,
      ...totals,
      clients: (devis as any).clients,
    }

    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'devis' })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${devis.number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('GET /api/devis/[id]/pdf error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/devis/
git commit -m "feat(v3): add devis action routes (send, reject, convert, duplicate, pdf)"
```

---

## Task 6: Factures CRUD API routes

**Files:**
- Create: `src/app/api/factures/route.ts`
- Create: `src/app/api/factures/[id]/route.ts`

- [ ] **Step 1: Create src/app/api/factures/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { client_id, appointment_id, tva_rate, notes, items } = body

    if (!client_id || typeof client_id !== 'string') {
      return NextResponse.json({ error: 'client_id is required' }, { status: 422 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 422 })
    }
    for (const item of items) {
      if (!item.description?.trim()) return NextResponse.json({ error: 'each item must have a description' }, { status: 422 })
      if (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) return NextResponse.json({ error: 'each item quantity must be > 0' }, { status: 422 })
      if (isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) return NextResponse.json({ error: 'each item unit_price must be >= 0' }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()
    const { data: numberData, error: numErr } = await supabase.rpc('generate_facture_number')
    if (numErr) throw numErr

    const { data: facture, error: factureErr } = await supabase
      .from('factures')
      .insert({
        number: numberData as string,
        client_id,
        appointment_id: appointment_id || null,
        tva_rate: tva_rate ?? 20,
        notes: notes?.trim() || null,
        events: [{ at: new Date().toISOString(), by: staff.id, status: 'draft' }],
      })
      .select()
      .single()
    if (factureErr) throw factureErr

    const itemRows = items.map((item: any, idx: number) => ({
      facture_id: facture.id,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      sort_order: idx,
    }))
    const { data: createdItems, error: itemsErr } = await supabase.from('facture_items').insert(itemRows).select()
    if (itemsErr) throw itemsErr

    const totals = computeTotals(createdItems!, facture.tva_rate)
    return NextResponse.json({ ...facture, items: createdItems, ...totals }, { status: 201 })
  } catch (err) {
    console.error('POST /api/factures error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status   = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const from     = searchParams.get('from')
    const to       = searchParams.get('to')
    const search   = searchParams.get('search')

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('factures')
      .select(`
        id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
        client_id, devis_id, appointment_id,
        clients(name, phone, email),
        facture_items(id, description, quantity, unit_price, sort_order)
      `)
      .order('created_at', { ascending: false })

    if (status)   query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (from)     query = query.gte('created_at', from)
    if (to)       query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error

    const items_all = (data || [])
      .filter((f: any) => {
        if (!search) return true
        const q = search.toLowerCase()
        return f.number.toLowerCase().includes(q) || f.clients?.name?.toLowerCase().includes(q)
      })
      .map((f: any) => {
        const items = (f.facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        const totals = computeTotals(items, f.tva_rate)
        return { ...f, items, ...totals, facture_items: undefined }
      })

    // Revenue summary for filtered set (paid factures only)
    const paidItems = items_all.filter((f: any) => f.status === 'paid')
    const summary = {
      subtotal_ht: Math.round(paidItems.reduce((s: number, f: any) => s + f.subtotal_ht, 0) * 100) / 100,
      tva_amount:  Math.round(paidItems.reduce((s: number, f: any) => s + f.tva_amount,  0) * 100) / 100,
      total_ttc:   Math.round(paidItems.reduce((s: number, f: any) => s + f.total_ttc,   0) * 100) / 100,
    }

    return NextResponse.json({ items: items_all, summary })
  } catch (err) {
    console.error('GET /api/factures error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create src/app/api/factures/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'

async function fetchFactureWithItems(supabase: ReturnType<typeof createServerSupabaseClient>, id: string) {
  return supabase
    .from('factures')
    .select(`
      id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
      client_id, devis_id, appointment_id,
      clients(name, phone, email),
      facture_items(id, description, quantity, unit_price, sort_order)
    `)
    .eq('id', id)
    .single()
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const supabase = createServerSupabaseClient()
    const { data, error } = await fetchFactureWithItems(supabase, params.id)
    if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const items = ((data as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    return NextResponse.json({ ...data, items, ...computeTotals(items, data.tva_rate) })
  } catch (err) {
    console.error('GET /api/factures/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const supabase = createServerSupabaseClient()
    const { data: existing } = await supabase.from('factures').select('id, status').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (existing.status !== 'draft') return NextResponse.json({ error: 'not_draft' }, { status: 409 })

    const body = await request.json()
    const { notes, tva_rate, items } = body
    const updates: Record<string, unknown> = {}
    if (notes !== undefined)    updates.notes = notes?.trim() || null
    if (tva_rate !== undefined) updates.tva_rate = Number(tva_rate)

    if (Object.keys(updates).length > 0) {
      await supabase.from('factures').update(updates).eq('id', params.id)
    }
    if (Array.isArray(items)) {
      if (items.length === 0) return NextResponse.json({ error: 'items must not be empty' }, { status: 422 })
      await supabase.from('facture_items').delete().eq('facture_id', params.id)
      await supabase.from('facture_items').insert(
        items.map((item: any, idx: number) => ({
          facture_id: params.id,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          sort_order: idx,
        }))
      )
    }

    const { data, error } = await fetchFactureWithItems(supabase, params.id)
    if (error || !data) throw error
    const sortedItems = ((data as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    return NextResponse.json({ ...data, items: sortedItems, ...computeTotals(sortedItems, data.tva_rate) })
  } catch (err) {
    console.error('PATCH /api/factures/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const supabase = createServerSupabaseClient()
    const { data: existing } = await supabase.from('factures').select('id, status').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (existing.status !== 'draft') return NextResponse.json({ error: 'not_draft' }, { status: 409 })
    await supabase.from('factures').delete().eq('id', params.id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/factures/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/factures/
git commit -m "feat(v3): add factures CRUD API routes"
```

---

## Task 7: Factures action routes

**Files:**
- Create: `src/app/api/factures/[id]/send/route.ts`
- Create: `src/app/api/factures/[id]/mark-paid/route.ts`
- Create: `src/app/api/factures/[id]/cancel/route.ts`
- Create: `src/app/api/factures/[id]/pdf/route.ts`

- [ ] **Step 1: Create send route**

`src/app/api/factures/[id]/send/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'
import { resend } from '@/lib/resend'
import { factureEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture, error: fetchErr } = await supabase
      .from('factures')
      .select(`id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
               client_id, devis_id, appointment_id, clients(name, phone, email),
               facture_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()

    if (fetchErr || !facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(facture.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const client = (facture as any).clients
    const toEmail = body?.email || client?.email
    if (!toEmail) return NextResponse.json({ error: 'no_email' }, { status: 422 })

    const items = ((facture as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, facture.tva_rate)
    const docData = { ...facture, status: 'sent', items, ...totals, clients: client }

    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'facture' })
    )

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'sent' }]
    await supabase.from('factures').update({ status: 'sent', events: newEvents }).eq('id', params.id)

    const template = factureEmail({ clientName: client?.name ?? 'Client', number: facture.number, totalTtc: totals.total_ttc })
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [toEmail],
      subject: template.subject,
      html: template.html,
      attachments: [{ filename: `${facture.number}.pdf`, content: buffer }],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/send error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create mark-paid route**

`src/app/api/factures/[id]/mark-paid/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture } = await supabase.from('factures').select('id, status, events').eq('id', params.id).single()
    if (!facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (facture.status !== 'sent') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })

    const body = await request.json()
    const { payment_method, paid_amount } = body

    if (!payment_method || !['cash', 'card', 'transfer'].includes(payment_method)) {
      return NextResponse.json({ error: 'payment_method must be cash, card, or transfer' }, { status: 422 })
    }
    if (paid_amount === undefined || isNaN(Number(paid_amount)) || Number(paid_amount) < 0) {
      return NextResponse.json({ error: 'paid_amount must be >= 0' }, { status: 422 })
    }

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'paid' }]
    const { error } = await supabase.from('factures').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: Number(paid_amount),
      payment_method,
      events: newEvents,
    }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/mark-paid error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create cancel route**

`src/app/api/factures/[id]/cancel/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture } = await supabase.from('factures').select('id, status, events').eq('id', params.id).single()
    if (!facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (facture.status === 'paid') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    if (!['draft', 'sent'].includes(facture.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'cancelled' }]
    const { error } = await supabase.from('factures').update({ status: 'cancelled', events: newEvents }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create PDF route**

`src/app/api/factures/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture, error } = await supabase
      .from('factures')
      .select(`id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
               client_id, devis_id, appointment_id,
               clients(name, phone, email), facture_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (error || !facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const items = ((facture as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, facture.tva_rate)
    const docData = { ...facture, items, ...totals, clients: (facture as any).clients }

    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'facture' })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${facture.number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('GET /api/factures/[id]/pdf error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run build check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/factures/
git commit -m "feat(v3): add factures action routes (send, mark-paid, cancel, pdf)"
```

---

## Task 8: Sidebar navigation update

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add FileText and Receipt imports**

In `src/app/dashboard/layout.tsx`, update the lucide-react import line to add `FileText` and `Receipt`:

```typescript
import { Calendar, Plus, Users, Scissors, LogOut, Package, ShoppingBag, BarChart2, FileText, Receipt } from 'lucide-react'
```

- [ ] **Step 2: Add nav items**

Add to the `navItems` array after the `BarChart2` entry:

```typescript
{ href: '/dashboard/devis',    label: 'Devis',     icon: FileText, badge: null },
{ href: '/dashboard/factures', label: 'Factures',  icon: Receipt,  badge: null },
```

- [ ] **Step 3: Verify the sidebar renders**

```bash
npx tsc --noEmit
```

Then visually: open the app at `http://localhost:3000/dashboard/calendar` and confirm "Devis" and "Factures" appear in the left sidebar below "Historique ventes".

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat(v3): add Devis and Factures nav items to sidebar"
```

---

## Task 9: LineItemsBuilder shared component

**Files:**
- Create: `src/components/dashboard/LineItemsBuilder.tsx`

This component is shared by both `/dashboard/devis/new` and `/dashboard/factures/new`. It manages a list of line items and exposes the current items + computed totals upward via a callback.

- [ ] **Step 1: Create src/components/dashboard/LineItemsBuilder.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export interface LineItem {
  id: string          // client-side key only (not sent to API)
  description: string
  quantity: number
  unit_price: number
}

interface Props {
  tva_rate: number
  onChange: (items: LineItem[], totals: { subtotal_ht: number; tva_amount: number; total_ttc: number }) => void
  initialItems?: LineItem[]
}

function computeTotals(items: LineItem[], tva_rate: number) {
  const subtotal_ht = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const tva_amount  = subtotal_ht * tva_rate / 100
  const total_ttc   = subtotal_ht + tva_amount
  return {
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    tva_amount:  Math.round(tva_amount  * 100) / 100,
    total_ttc:   Math.round(total_ttc   * 100) / 100,
  }
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

export function LineItemsBuilder({ tva_rate, onChange, initialItems }: Props) {
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [newItem()])

  useEffect(() => {
    onChange(items, computeTotals(items, tva_rate))
  }, [items, tva_rate])  // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function addItem() {
    setItems(prev => [...prev, newItem()])
  }

  function removeItem(id: string) {
    if (items.length === 1) return  // keep at least one row
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const next = [...items]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setItems(next)
  }

  const totals = computeTotals(items, tva_rate)

  return (
    <div className="space-y-2">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_110px_90px_40px] gap-2 px-2 text-xs font-medium text-salon-muted uppercase tracking-wide">
        <span>Description</span>
        <span className="text-center">Qté</span>
        <span className="text-right">Prix HT (MAD)</span>
        <span className="text-right">Total HT</span>
        <span />
      </div>

      {/* Rows */}
      {items.map((item, idx) => {
        const lineTotal = item.quantity * item.unit_price
        return (
          <div key={item.id} className="grid grid-cols-[1fr_80px_110px_90px_40px] gap-2 items-center">
            <input
              type="text"
              value={item.description}
              onChange={e => updateItem(item.id, 'description', e.target.value)}
              placeholder="Description de la prestation / produit"
              className="input-field text-sm"
            />
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={item.quantity}
              onChange={e => updateItem(item.id, 'quantity', Math.max(0.01, Number(e.target.value)))}
              className="input-field text-sm text-center"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.unit_price}
              onChange={e => updateItem(item.id, 'unit_price', Math.max(0, Number(e.target.value)))}
              className="input-field text-sm text-right"
            />
            <span className="text-sm text-right text-salon-dark font-medium pr-1">
              {lineTotal.toFixed(2)}
            </span>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveItem(item.id, -1)}
                disabled={idx === 0}
                className="p-0.5 text-salon-muted hover:text-salon-dark disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="p-0.5 text-red-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveItem(item.id, 1)}
                disabled={idx === items.length - 1}
                className="p-0.5 text-salon-muted hover:text-salon-dark disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        )
      })}

      {/* Add row */}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-sm text-salon-pink hover:text-salon-dark transition mt-1"
      >
        <Plus size={14} />
        Ajouter une ligne
      </button>

      {/* Totals preview */}
      <div className="border-t border-salon-rose/20 pt-3 mt-3 space-y-1 text-sm">
        <div className="flex justify-end gap-6">
          <span className="text-salon-muted">Sous-total HT</span>
          <span className="w-28 text-right font-medium">{totals.subtotal_ht.toFixed(2)} MAD</span>
        </div>
        <div className="flex justify-end gap-6">
          <span className="text-salon-muted">TVA ({tva_rate}%)</span>
          <span className="w-28 text-right font-medium">{totals.tva_amount.toFixed(2)} MAD</span>
        </div>
        <div className="flex justify-end gap-6 border-t border-salon-rose/20 pt-2">
          <span className="font-semibold text-salon-dark">Total TTC</span>
          <span className="w-28 text-right font-bold text-salon-pink text-base">{totals.total_ttc.toFixed(2)} MAD</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/LineItemsBuilder.tsx
git commit -m "feat(v3): add shared LineItemsBuilder component"
```

---

## Task 10: Devis list page

**Files:**
- Create: `src/app/dashboard/devis/page.tsx`

- [ ] **Step 1: Create src/app/dashboard/devis/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Download, Send, ArrowRightLeft, Copy, Trash2, RefreshCw
} from 'lucide-react'
import type { DevisWithRelations, DevisStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
}

export default function DevisListPage() {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/devis?${params}`)
    if (res.ok) {
      setDevis(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, statusFilter])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(id: string) {
    setActionLoading(id + '-send')
    const res = await fetch(`/api/devis/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error === 'no_email' ? 'Ce client n\'a pas d\'adresse email.' : 'Erreur lors de l\'envoi.')
    }
    setActionLoading(null)
    await load()
  }

  async function handleConvert(id: string) {
    if (!confirm('Convertir ce devis en facture ?')) return
    setActionLoading(id + '-convert')
    const res = await fetch(`/api/devis/${id}/convert`, { method: 'POST' })
    if (res.ok) {
      const facture = await res.json()
      router.push(`/dashboard/factures/${facture.id}`)
    } else {
      setError('Impossible de convertir ce devis.')
    }
    setActionLoading(null)
  }

  async function handleDuplicate(id: string) {
    setActionLoading(id + '-dup')
    const res = await fetch(`/api/devis/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const newDevis = await res.json()
      router.push(`/dashboard/devis/${newDevis.id}`)
    }
    setActionLoading(null)
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Supprimer définitivement le devis ${number} ?`)) return
    setActionLoading(id + '-del')
    await fetch(`/api/devis/${id}`, { method: 'DELETE' })
    setActionLoading(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-salon-dark">Devis</h1>
        <Link href="/dashboard/devis/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau devis
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 w-56 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field text-sm w-40"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : devis.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucun devis trouvé.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream border-b border-salon-rose/20">
              <tr>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Référence</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Client</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Date</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Total TTC</th>
                <th className="text-center px-4 py-3 text-salon-muted font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devis.map(d => (
                <tr key={d.id} className="border-b border-salon-rose/10 hover:bg-salon-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/devis/${d.id}`} className="font-mono text-salon-pink hover:underline">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-salon-dark">{(d.clients as any)?.name}</td>
                  <td className="px-4 py-3 text-salon-muted">
                    {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-salon-dark">
                    {d.total_ttc.toFixed(2)} MAD
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                        <Download size={15} className="text-salon-muted hover:text-salon-dark" />
                      </a>
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleSend(d.id)} title="Envoyer par email" disabled={!!actionLoading}>
                          <Send size={15} className="text-salon-muted hover:text-blue-600" />
                        </button>
                      )}
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleConvert(d.id)} title="Convertir en facture" disabled={!!actionLoading}>
                          <ArrowRightLeft size={15} className="text-salon-muted hover:text-green-600" />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(d.id)} title="Dupliquer" disabled={!!actionLoading}>
                        <Copy size={15} className="text-salon-muted hover:text-salon-dark" />
                      </button>
                      {d.status === 'draft' && (
                        <button onClick={() => handleDelete(d.id, d.number)} title="Supprimer" disabled={!!actionLoading}>
                          <Trash2 size={15} className="text-salon-muted hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/devis/page.tsx
git commit -m "feat(v3): add devis list page with filters and inline actions"
```

---

## Task 11: Devis new + detail pages

**Files:**
- Create: `src/app/dashboard/devis/new/page.tsx`
- Create: `src/app/dashboard/devis/[id]/page.tsx`

- [ ] **Step 1: Create src/app/dashboard/devis/new/page.tsx**

```tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
import type { Client } from '@/lib/supabase/types'

export default function NewDevisPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [tvaRate, setTvaRate] = useState(20)
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [totals, setTotals] = useState({ subtotal_ht: 0, tva_amount: 0, total_ttc: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIdRef = useRef<string | null>(null)

  // Load clients
  useEffect(() => {
    supabase.from('clients').select('id, name, phone, email').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  function handleItemsChange(newItems: LineItem[], newTotals: typeof totals) {
    setItems(newItems)
    setTotals(newTotals)
    triggerAutoSave()
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(autoSave, 1000)
  }

  const autoSave = useCallback(async () => {
    if (!clientId || items.length === 0 || items.every(i => !i.description.trim())) return
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) return

    const payload = {
      client_id: clientId,
      tva_rate: tvaRate,
      valid_until: validUntil || null,
      notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }

    if (savedIdRef.current) {
      // Update existing draft
      await fetch(`/api/devis/${savedIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      // Create new draft
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        savedIdRef.current = data.id
      }
    }
  }, [clientId, items, tvaRate, validUntil, notes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearTimeout(autoSaveRef.current)
    setError(null)

    if (!clientId) { setError('Veuillez sélectionner un client.'); return }
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Ajoutez au moins une ligne.'); return }

    setSaving(true)
    const payload = {
      client_id: clientId,
      tva_rate: tvaRate,
      valid_until: validUntil || null,
      notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }

    let res: Response
    if (savedIdRef.current) {
      res = await fetch(`/api/devis/${savedIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    if (res.ok) {
      const data = await res.json()
      router.push(`/dashboard/devis/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error || 'Erreur lors de la création.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-salon-dark">Nouveau devis</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <h2 className="font-medium text-salon-dark">Client</h2>
          <div>
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="input-field w-full text-sm mb-2"
            />
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); triggerAutoSave() }}
              className="input-field w-full text-sm"
              size={4}
            >
              <option value="">— Sélectionner —</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-salon-muted mb-1">Taux TVA (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={tvaRate}
              onChange={e => { setTvaRate(Number(e.target.value)); triggerAutoSave() }}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-salon-muted mb-1">Valable jusqu'au</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => { setValidUntil(e.target.value); triggerAutoSave() }}
              className="input-field w-full text-sm"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-3">
          <h2 className="font-medium text-salon-dark">Prestations / Produits</h2>
          <LineItemsBuilder tva_rate={tvaRate} onChange={handleItemsChange} />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
          <label className="block text-xs text-salon-muted mb-1">Notes (optionnel)</label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); triggerAutoSave() }}
            rows={3}
            className="input-field w-full text-sm resize-none"
            placeholder="Informations complémentaires..."
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : 'Créer le devis'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/dashboard/devis/[id]/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Send, ArrowRightLeft, Copy, Trash2, CheckCircle, XCircle } from 'lucide-react'
import type { DevisWithRelations, StatusEvent } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
}

export default function DevisDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/devis/${params.id}`)
    if (res.ok) setDevis(await res.json())
    else router.push('/dashboard/devis')
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function action(path: string, method = 'POST', body?: object) {
    setActionLoading(path)
    setError(null)
    const res = await fetch(`/api/devis/${params.id}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? 'Ce client n\'a pas d\'email.' : `Erreur: ${b.error}`)
    }
    setActionLoading(null)
    await load()
  }

  async function handleConvert() {
    if (!confirm('Convertir ce devis en facture ?')) return
    setActionLoading('convert')
    const res = await fetch(`/api/devis/${params.id}/convert`, { method: 'POST' })
    if (res.ok) {
      const facture = await res.json()
      router.push(`/dashboard/factures/${facture.id}`)
    } else {
      const b = await res.json()
      setError(`Erreur: ${b.error}`)
      setActionLoading(null)
    }
  }

  async function handleDuplicate() {
    setActionLoading('duplicate')
    const res = await fetch(`/api/devis/${params.id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      router.push(`/dashboard/devis/${d.id}`)
    }
    setActionLoading(null)
  }

  async function handleDelete() {
    if (!devis || !confirm(`Supprimer définitivement le devis ${devis.number} ?`)) return
    setActionLoading('delete')
    await fetch(`/api/devis/${params.id}`, { method: 'DELETE' })
    router.push('/dashboard/devis')
  }

  if (loading) return <p className="text-salon-muted text-sm">Chargement...</p>
  if (!devis) return null

  const client = devis.clients as any

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-salon-muted mb-1">
            <Link href="/dashboard/devis" className="hover:underline">Devis</Link> / {devis.number}
          </p>
          <h1 className="text-xl font-semibold text-salon-dark font-mono">{devis.number}</h1>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[devis.status] ?? ''}`}>
            {STATUS_LABELS[devis.status] ?? devis.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-end">
          <a href={`/api/devis/${devis.id}/pdf`} target="_blank" rel="noreferrer"
            className="btn-secondary flex items-center gap-1 text-sm">
            <Download size={14} /> PDF
          </a>
          {['draft', 'sent'].includes(devis.status) && (
            <button onClick={() => action('send', 'POST', {})}
              disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm">
              <Send size={14} /> Envoyer
            </button>
          )}
          {devis.status === 'sent' && (
            <button onClick={() => action('reject')}
              disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm text-red-600">
              <XCircle size={14} /> Refuser
            </button>
          )}
          {['draft', 'sent'].includes(devis.status) && (
            <button onClick={handleConvert}
              disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm text-green-700">
              <ArrowRightLeft size={14} /> Convertir
            </button>
          )}
          <button onClick={handleDuplicate} disabled={!!actionLoading}
            className="btn-secondary flex items-center gap-1 text-sm">
            <Copy size={14} /> Dupliquer
          </button>
          {devis.status === 'draft' && (
            <button onClick={handleDelete} disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm text-red-600">
              <Trash2 size={14} /> Supprimer
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* Client + meta */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-salon-muted text-xs mb-1">Client</p>
          <p className="font-medium text-salon-dark">{client?.name}</p>
          {client?.phone && <p className="text-salon-muted">{client.phone}</p>}
          {client?.email && <p className="text-salon-muted">{client.email}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-salon-muted text-xs">Date de création</p>
          <p>{new Date(devis.created_at).toLocaleDateString('fr-FR')}</p>
          {devis.valid_until && (
            <>
              <p className="text-salon-muted text-xs mt-2">Valable jusqu'au</p>
              <p>{new Date(devis.valid_until).toLocaleDateString('fr-FR')}</p>
            </>
          )}
          <p className="text-salon-muted text-xs mt-2">TVA</p>
          <p>{Number(devis.tva_rate)}%</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-salon-cream border-b border-salon-rose/20">
            <tr>
              <th className="text-left px-4 py-3 text-salon-muted font-medium">Description</th>
              <th className="text-center px-4 py-3 text-salon-muted font-medium">Qté</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Prix HT</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devis.items.map(item => (
              <tr key={item.id} className="border-b border-salon-rose/10">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-center">{Number(item.quantity)}</td>
                <td className="px-4 py-3 text-right">{Number(item.unit_price).toFixed(2)} MAD</td>
                <td className="px-4 py-3 text-right font-medium">
                  {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 space-y-1 text-sm border-t border-salon-rose/20">
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">Sous-total HT</span>
            <span className="w-28 text-right">{devis.subtotal_ht.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">TVA ({Number(devis.tva_rate)}%)</span>
            <span className="w-28 text-right">{devis.tva_amount.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6 border-t border-salon-rose/20 pt-2 font-bold text-salon-pink">
            <span>Total TTC</span>
            <span className="w-28 text-right">{devis.total_ttc.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {devis.notes && (
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 text-sm">
          <p className="text-salon-muted text-xs mb-2">Notes</p>
          <p className="text-salon-dark whitespace-pre-wrap">{devis.notes}</p>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
        <p className="text-sm font-medium text-salon-dark mb-3">Historique du statut</p>
        <div className="space-y-2">
          {((devis.events ?? []) as StatusEvent[]).map((ev, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <CheckCircle size={14} className="text-salon-pink flex-shrink-0" />
              <span className="text-salon-muted">
                {new Date(ev.at).toLocaleString('fr-FR')}
              </span>
              <span className="capitalize text-salon-dark">{STATUS_LABELS[ev.status] ?? ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/devis/
git commit -m "feat(v3): add devis new form and detail page"
```

---

## Task 12: Factures list page

**Files:**
- Create: `src/app/dashboard/factures/page.tsx`

- [ ] **Step 1: Create src/app/dashboard/factures/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Download, Send, CreditCard, XCircle, RefreshCw } from 'lucide-react'
import type { FactureWithRelations } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
}

export default function FacturesListPage() {
  const router = useRouter()
  const [factures, setFactures] = useState<FactureWithRelations[]>([])
  const [summary, setSummary] = useState({ subtotal_ht: 0, tva_amount: 0, total_ttc: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPaidModal, setShowPaidModal] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/factures?${params}`)
    if (res.ok) {
      const body = await res.json()
      setFactures(body.items)
      setSummary(body.summary)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, statusFilter])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(id: string) {
    setActionLoading(id + '-send')
    const res = await fetch(`/api/factures/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? 'Ce client n\'a pas d\'email.' : 'Erreur lors de l\'envoi.')
    }
    setActionLoading(null)
    await load()
  }

  async function handleMarkPaid(id: string) {
    setActionLoading(id + '-paid')
    const res = await fetch(`/api/factures/${id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod, paid_amount: Number(paidAmount) }),
    })
    if (!res.ok) {
      const b = await res.json()
      setError(`Erreur: ${b.error}`)
    }
    setActionLoading(null)
    setShowPaidModal(null)
    setPaidAmount('')
    setPaymentMethod('cash')
    await load()
  }

  async function handleCancel(id: string, number: string) {
    if (!confirm(`Annuler la facture ${number} ?`)) return
    setActionLoading(id + '-cancel')
    await fetch(`/api/factures/${id}/cancel`, { method: 'POST' })
    setActionLoading(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-salon-dark">Factures</h1>
        <Link href="/dashboard/factures/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouvelle facture
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total HT (payées)', value: summary.subtotal_ht },
          { label: 'Total TVA (payées)', value: summary.tva_amount },
          { label: 'Total TTC (payées)', value: summary.total_ttc },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-salon-rose/20 p-4">
            <p className="text-xs text-salon-muted mb-1">{label}</p>
            <p className="text-lg font-bold text-salon-pink">{value.toFixed(2)} MAD</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-8 w-56 text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm w-40">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : factures.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucune facture trouvée.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream border-b border-salon-rose/20">
              <tr>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Référence</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Client</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Date</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Total TTC</th>
                <th className="text-center px-4 py-3 text-salon-muted font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(f => (
                <tr key={f.id} className="border-b border-salon-rose/10 hover:bg-salon-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/factures/${f.id}`} className="font-mono text-salon-pink hover:underline">
                      {f.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{(f.clients as any)?.name}</td>
                  <td className="px-4 py-3 text-salon-muted">{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-right font-medium">{f.total_ttc.toFixed(2)} MAD</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                      {STATUS_LABELS[f.status] ?? f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/api/factures/${f.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                        <Download size={15} className="text-salon-muted hover:text-salon-dark" />
                      </a>
                      {['draft', 'sent'].includes(f.status) && (
                        <button onClick={() => handleSend(f.id)} disabled={!!actionLoading} title="Envoyer">
                          <Send size={15} className="text-salon-muted hover:text-blue-600" />
                        </button>
                      )}
                      {f.status === 'sent' && (
                        <button
                          onClick={() => { setShowPaidModal(f.id); setPaidAmount(f.total_ttc.toFixed(2)) }}
                          disabled={!!actionLoading} title="Marquer payée"
                        >
                          <CreditCard size={15} className="text-salon-muted hover:text-green-600" />
                        </button>
                      )}
                      {['draft', 'sent'].includes(f.status) && (
                        <button onClick={() => handleCancel(f.id, f.number)} disabled={!!actionLoading} title="Annuler">
                          <XCircle size={15} className="text-salon-muted hover:text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mark as paid modal */}
      {showPaidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-salon-dark">Marquer comme payée</h3>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Montant payé (MAD)</label>
              <input type="number" min={0} step={0.01} value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Mode de paiement</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field w-full text-sm">
                <option value="cash">Espèces</option>
                <option value="card">Carte bancaire</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleMarkPaid(showPaidModal)} disabled={!!actionLoading}
                className="btn-primary flex-1">Confirmer</button>
              <button onClick={() => { setShowPaidModal(null); setPaidAmount(''); }}
                className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/factures/page.tsx
git commit -m "feat(v3): add factures list page with revenue summary and inline actions"
```

---

## Task 13: Factures new + detail pages

**Files:**
- Create: `src/app/dashboard/factures/new/page.tsx`
- Create: `src/app/dashboard/factures/[id]/page.tsx`

- [ ] **Step 1: Create src/app/dashboard/factures/new/page.tsx**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
import type { Client } from '@/lib/supabase/types'

export default function NewFacturePage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [tvaRate, setTvaRate] = useState(20)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedIdRef = useRef<string | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    supabase.from('clients').select('id, name, phone, email').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
  )

  function triggerAutoSave() {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(autoSave, 1000)
  }

  async function autoSave() {
    if (!clientId) return
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) return
    const payload = {
      client_id: clientId, tva_rate: tvaRate, notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }
    if (savedIdRef.current) {
      await fetch(`/api/factures/${savedIdRef.current}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      const res = await fetch('/api/factures', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (res.ok) { const d = await res.json(); savedIdRef.current = d.id }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearTimeout(autoSaveRef.current)
    setError(null)
    if (!clientId) { setError('Veuillez sélectionner un client.'); return }
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Ajoutez au moins une ligne.'); return }
    setSaving(true)
    const payload = {
      client_id: clientId, tva_rate: tvaRate, notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }
    let res: Response
    if (savedIdRef.current) {
      res = await fetch(`/api/factures/${savedIdRef.current}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/factures', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    if (res.ok) {
      const data = await res.json()
      router.push(`/dashboard/factures/${data.id}`)
    } else {
      const b = await res.json()
      setError(b.error || 'Erreur lors de la création.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-salon-dark">Nouvelle facture</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <h2 className="font-medium text-salon-dark">Client</h2>
          <input type="text" placeholder="Rechercher un client..." value={clientSearch}
            onChange={e => setClientSearch(e.target.value)} className="input-field w-full text-sm mb-2" />
          <select value={clientId} onChange={e => { setClientId(e.target.value); triggerAutoSave() }}
            className="input-field w-full text-sm" size={4}>
            <option value="">— Sélectionner —</option>
            {filteredClients.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
          <label className="block text-xs text-salon-muted mb-1">Taux TVA (%)</label>
          <input type="number" min={0} max={100} step={0.01} value={tvaRate}
            onChange={e => { setTvaRate(Number(e.target.value)); triggerAutoSave() }}
            className="input-field w-32 text-sm" />
        </div>

        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-3">
          <h2 className="font-medium text-salon-dark">Prestations / Produits</h2>
          <LineItemsBuilder tva_rate={tvaRate}
            onChange={(newItems) => { setItems(newItems); triggerAutoSave() }} />
        </div>

        <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
          <label className="block text-xs text-salon-muted mb-1">Notes (optionnel)</label>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); triggerAutoSave() }}
            rows={3} className="input-field w-full text-sm resize-none"
            placeholder="Informations complémentaires..." />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : 'Créer la facture'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/dashboard/factures/[id]/page.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Send, CreditCard, XCircle, CheckCircle } from 'lucide-react'
import type { FactureWithRelations, StatusEvent } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte bancaire', transfer: 'Virement',
}

export default function FactureDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [facture, setFacture] = useState<FactureWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPaidModal, setShowPaidModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/factures/${params.id}`)
    if (res.ok) setFacture(await res.json())
    else router.push('/dashboard/factures')
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function doAction(path: string, body?: object) {
    setActionLoading(path)
    setError(null)
    const res = await fetch(`/api/factures/${params.id}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? 'Ce client n\'a pas d\'email.' : `Erreur: ${b.error}`)
    }
    setActionLoading(null)
    await load()
  }

  async function handleMarkPaid() {
    await doAction('mark-paid', { payment_method: paymentMethod, paid_amount: Number(paidAmount) })
    setShowPaidModal(false)
    setPaidAmount('')
    setPaymentMethod('cash')
  }

  async function handleCancel() {
    if (!facture || !confirm(`Annuler la facture ${facture.number} ?`)) return
    await doAction('cancel')
  }

  if (loading) return <p className="text-salon-muted text-sm">Chargement...</p>
  if (!facture) return null

  const client = facture.clients as any

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-salon-muted mb-1">
            <Link href="/dashboard/factures" className="hover:underline">Factures</Link> / {facture.number}
          </p>
          <h1 className="text-xl font-semibold text-salon-dark font-mono">{facture.number}</h1>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[facture.status] ?? ''}`}>
            {STATUS_LABELS[facture.status] ?? facture.status}
          </span>
          {facture.devis_id && (
            <Link href={`/dashboard/devis/${facture.devis_id}`}
              className="ml-2 text-xs text-salon-muted hover:text-salon-pink">
              Voir le devis source →
            </Link>
          )}
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <a href={`/api/factures/${facture.id}/pdf`} target="_blank" rel="noreferrer"
            className="btn-secondary flex items-center gap-1 text-sm">
            <Download size={14} /> PDF
          </a>
          {['draft', 'sent'].includes(facture.status) && (
            <button onClick={() => doAction('send', {})} disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm">
              <Send size={14} /> Envoyer
            </button>
          )}
          {facture.status === 'sent' && (
            <button
              onClick={() => { setShowPaidModal(true); setPaidAmount(facture.total_ttc.toFixed(2)) }}
              disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm text-green-700"
            >
              <CreditCard size={14} /> Marquer payée
            </button>
          )}
          {['draft', 'sent'].includes(facture.status) && (
            <button onClick={handleCancel} disabled={!!actionLoading}
              className="btn-secondary flex items-center gap-1 text-sm text-red-600">
              <XCircle size={14} /> Annuler
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* Client + meta */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-salon-muted text-xs mb-1">Client</p>
          <p className="font-medium text-salon-dark">{client?.name}</p>
          {client?.phone && <p className="text-salon-muted">{client.phone}</p>}
          {client?.email && <p className="text-salon-muted">{client.email}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-salon-muted text-xs">Date</p>
          <p>{new Date(facture.created_at).toLocaleDateString('fr-FR')}</p>
          <p className="text-salon-muted text-xs mt-2">TVA</p>
          <p>{Number(facture.tva_rate)}%</p>
          {facture.paid_at && (
            <>
              <p className="text-salon-muted text-xs mt-2">Paiement</p>
              <p className="text-green-700 font-medium">
                {new Date(facture.paid_at).toLocaleDateString('fr-FR')}
                {facture.payment_method ? ` — ${PAYMENT_LABELS[facture.payment_method]}` : ''}
                {facture.paid_amount != null ? ` — ${Number(facture.paid_amount).toFixed(2)} MAD` : ''}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-salon-cream border-b border-salon-rose/20">
            <tr>
              <th className="text-left px-4 py-3 text-salon-muted font-medium">Description</th>
              <th className="text-center px-4 py-3 text-salon-muted font-medium">Qté</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Prix HT</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.items.map(item => (
              <tr key={item.id} className="border-b border-salon-rose/10">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-center">{Number(item.quantity)}</td>
                <td className="px-4 py-3 text-right">{Number(item.unit_price).toFixed(2)} MAD</td>
                <td className="px-4 py-3 text-right font-medium">
                  {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 space-y-1 text-sm border-t border-salon-rose/20">
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">Sous-total HT</span>
            <span className="w-28 text-right">{facture.subtotal_ht.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">TVA ({Number(facture.tva_rate)}%)</span>
            <span className="w-28 text-right">{facture.tva_amount.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6 border-t border-salon-rose/20 pt-2 font-bold text-salon-pink">
            <span>Total TTC</span>
            <span className="w-28 text-right">{facture.total_ttc.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {facture.notes && (
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 text-sm">
          <p className="text-salon-muted text-xs mb-2">Notes</p>
          <p className="text-salon-dark whitespace-pre-wrap">{facture.notes}</p>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
        <p className="text-sm font-medium text-salon-dark mb-3">Historique du statut</p>
        <div className="space-y-2">
          {((facture.events ?? []) as StatusEvent[]).map((ev, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <CheckCircle size={14} className="text-salon-pink flex-shrink-0" />
              <span className="text-salon-muted">{new Date(ev.at).toLocaleString('fr-FR')}</span>
              <span className="capitalize text-salon-dark">{STATUS_LABELS[ev.status] ?? ev.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mark as paid modal */}
      {showPaidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-salon-dark">Marquer comme payée</h3>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Montant payé (MAD)</label>
              <input type="number" min={0} step={0.01} value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Mode de paiement</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field w-full text-sm">
                <option value="cash">Espèces</option>
                <option value="card">Carte bancaire</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleMarkPaid} disabled={!!actionLoading} className="btn-primary flex-1">
                Confirmer
              </button>
              <button onClick={() => { setShowPaidModal(false); setPaidAmount('') }} className="btn-secondary flex-1">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Final build verification**

```bash
npx tsc --noEmit && npx next build
```

Expected: TypeScript clean, Next.js build succeeds (eslint errors ignored per config). If `@react-pdf/renderer` causes a build error about missing canvas/sharp, add it to `serverComponentsExternalPackages` — it's already there in next.config.mjs from Task 1.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/factures/
git commit -m "feat(v3): add factures new form and detail page — V3 complete"
```

---

## Manual Verification Checklist

After all 13 tasks:

**API smoke tests** (requires a running dev server and a valid session cookie from the dashboard):

```bash
# Create a devis — replace CLIENT_ID with a real client UUID from your DB
curl -X POST http://localhost:3000/api/devis \
  -H "Content-Type: application/json" \
  -b "..." \
  -d '{
    "client_id": "CLIENT_ID",
    "tva_rate": 20,
    "valid_until": "2026-04-30",
    "items": [
      {"description": "Lissage brésilien", "quantity": 1, "unit_price": 650},
      {"description": "Soin kératine", "quantity": 1, "unit_price": 200}
    ]
  }'
# Expected: 201 with number DEV-2026-001, subtotal_ht: 850, tva_amount: 170, total_ttc: 1020

# Get list
curl http://localhost:3000/api/devis -b "..."
# Expected: array with 1 item

# Download PDF
curl http://localhost:3000/api/devis/DEVIS_ID/pdf -b "..." -o test.pdf
# Expected: PDF file opens in browser
```

**UI flow:**
1. Navigate to `/dashboard/devis` — list loads, "Nouveau devis" button visible
2. Click "Nouveau devis" — form with client selector, line items builder, live totals
3. Fill form, submit → redirected to detail page (e.g. DEV-2026-001)
4. Click "PDF" → browser downloads/opens PDF with correct layout
5. Click "Convertir" → confirm modal → redirected to `/dashboard/factures/FAC-2026-001`
6. On facture detail, click "Envoyer" → email sent (check Resend logs)
7. Click "Marquer payée" → modal → confirm → status changes to "Payée"
8. Navigate to `/dashboard/factures` — revenue summary shows correct HT/TVA/TTC totals

---

## Appendix: CSS class reference

These Tailwind utility classes are already used elsewhere in the codebase. Use them consistently:

```
input-field   → border border-salon-rose/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-salon-pink
btn-primary   → bg-salon-pink text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-salon-pink/90 transition
btn-secondary → border border-salon-rose/20 text-salon-dark px-4 py-2 rounded-lg text-sm hover:bg-salon-cream transition
```

If these classes aren't defined in globals.css, use the equivalent inline Tailwind classes. Check `src/app/globals.css` for existing utility definitions.
