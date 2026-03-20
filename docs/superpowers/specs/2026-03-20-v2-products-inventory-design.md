# Brazilian Studio — V2 Products & Inventory Design

**Date:** 2026-03-20
**Scope:** V2 — Products & Inventory management
**Status:** Draft
**Depends on:** V1 spec (2026-03-19-salon-management-design.md)

---

## 1. Overview

V2 adds product catalog management and sales tracking to the Brazilian Studio Rabat dashboard. Staff can manage inventory (nail polishes, hair treatments, skincare, etc.), record sales linked to appointments or as walk-in purchases, and monitor stock levels with automatic low-stock alerts.

**Key constraints:**
- `buying_price` is internal only — never exposed to clients
- `selling_price` is what the client pays
- Margin = `selling_price - buying_price` (shown only in staff dashboard)
- All prices in MAD (Moroccan Dirham)
- Sales can be linked to an appointment OR standalone (walk-in)
- Low-stock alerts: dashboard badge + email to manager

---

## 2. Architecture

Same hybrid architecture as V1:
- **Reads**: Browser → Supabase client directly (RLS enforced)
- **Writes**: Browser → Next.js API routes → Supabase (service_role key)
- **Auth**: Same staff auth — all `/dashboard/*` routes protected by existing middleware
- **Email**: Resend (existing client) — low-stock alert to `NOTIFY_EMAIL_1` (manager)

---

## 3. Database Schema

### `products`
```sql
CREATE TABLE products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  brand               text,
  buying_price        numeric(10,2) NOT NULL CHECK (buying_price >= 0),
  selling_price       numeric(10,2) NOT NULL CHECK (selling_price >= 0),
  stock_quantity      integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

### `product_sales`
```sql
CREATE TABLE product_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sold_by        uuid REFERENCES staff(id) ON DELETE SET NULL,
  sold_at        timestamptz NOT NULL DEFAULT now(),
  notes          text
);
```

**Notes:**
- `appointment_id` is nullable — null means walk-in sale
- `unit_price` is a snapshot of `selling_price` at time of sale (price may change later)
- `ON DELETE RESTRICT` on `product_id` — cannot delete a product that has sales history; use `is_active = false` instead

### RLS Policies

```sql
-- Products: anyone can read active products; only staff can write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read active products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "staff can manage products"
  ON products FOR ALL
  USING (is_staff());

-- Product sales: staff only
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage product_sales"
  ON product_sales FOR ALL
  USING (is_staff());
```

---

## 4. API Routes

### `POST /api/products`
Create a new product.

**Auth:** Staff only (verify via Supabase Auth in route)

**Request body:**
```json
{
  "name": "OPI Nail Polish — Red",
  "brand": "OPI",
  "buying_price": 45.00,
  "selling_price": 120.00,
  "stock_quantity": 10,
  "low_stock_threshold": 3
}
```

**Validation:**
- `name` required
- `buying_price`, `selling_price` required, ≥ 0
- `selling_price` ≥ `buying_price` (warn but don't block — manager may set promo price)
- `stock_quantity` ≥ 0, integer
- `low_stock_threshold` ≥ 0, integer

**Response:** `201` with created product (without `buying_price` — omit from response for security; buying_price only returned to staff via separate authenticated fetch)

**Note:** `buying_price` is stored in DB but the POST response returns the full product including `buying_price` since this endpoint is staff-only.

---

### `PATCH /api/products/[id]`
Update product fields (name, brand, prices, stock, threshold, is_active).

**Auth:** Staff only

**Allowed fields:** `name`, `brand`, `buying_price`, `selling_price`, `stock_quantity`, `low_stock_threshold`, `is_active`

**Response:** `200` with updated product

**Error codes:**
- `404` — product not found
- `422` — validation error

---

### `DELETE /api/products/[id]`
Hard delete only if no sales history. Otherwise returns error.

**Auth:** Staff only

**Logic:**
```
count product_sales where product_id = id
if count > 0 → 409 { error: "has_sales", message: "Ce produit a des ventes associées. Désactivez-le plutôt que de le supprimer." }
else → delete → 204
```

---

### `POST /api/sales`
Record a sale (one or more products in a single transaction).

**Auth:** Staff only

**Request body:**
```json
{
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "appointment_id": "uuid-or-null",
  "sold_by": "uuid",
  "notes": "optional"
}
```

**Logic (in order):**
1. Validate all product_ids exist and are active
2. Validate stock sufficient for each item (`stock_quantity >= quantity`)
3. Begin transaction:
   - Insert rows into `product_sales` (one row per product, `unit_price` = current `selling_price`)
   - Decrement `stock_quantity` for each product
4. After transaction: check each product's new stock against `low_stock_threshold`
5. For each product where `stock_quantity <= low_stock_threshold`: send low-stock email (non-fatal, fire-and-forget)
6. Return `201` with created sale items

**Error codes:**
- `400` — items array empty
- `404` — product not found or inactive
- `422` — insufficient stock `{ error: "insufficient_stock", product_id: "...", available: N, requested: M }`

**Low-stock email** (sent to `NOTIFY_EMAIL_1`):
- Subject: `⚠️ Stock bas — [Product Name]`
- Body: `Le produit "[name]" ([brand]) a seulement [N] unité(s) restante(s). Seuil: [threshold].`

---

### `GET /api/sales`
Fetch sales history with optional filters.

**Auth:** Staff only

**Query params:**
- `from` — ISO date (default: start of current month)
- `to` — ISO date (default: today)
- `product_id` — filter by product
- `appointment_id` — filter by appointment

**Response:** Array of sales joined with product name/brand and staff name, ordered by `sold_at DESC`

```json
[
  {
    "id": "uuid",
    "sold_at": "2026-03-20T14:30:00Z",
    "product": { "id": "uuid", "name": "OPI Nail Polish", "brand": "OPI" },
    "quantity": 2,
    "unit_price": 120.00,
    "total": 240.00,
    "margin_per_unit": 75.00,
    "margin_total": 150.00,
    "appointment_id": "uuid-or-null",
    "sold_by": { "id": "uuid", "name": "Employée 1" },
    "notes": null
  }
]
```

**Note:** `margin_per_unit` and `margin_total` are computed server-side by joining `product_sales.unit_price` with `products.buying_price`. Never expose `buying_price` directly in the response — compute margin on the server and return only the margin value.

---

## 5. Dashboard Pages

### `/dashboard/products`
Product catalog page.

**Features:**
- Table/grid of all products (name, brand, selling price, stock quantity, margin %)
- Low-stock badge (red) when `stock_quantity <= low_stock_threshold`
- "Ajouter un produit" button → slide-over or modal form
- Edit/delete per row (delete disabled with tooltip if has sales)
- Toggle `is_active` to hide discontinued products
- Filter: show active only (default) / show all

**Data source:** Direct Supabase query (staff-authenticated browser client)

---

### `/dashboard/ventes/new`
Record a new sale.

**Features:**
- Search/select products (autocomplete by name or brand)
- Per product: set quantity (shows available stock)
- Optional: link to an appointment (searchable dropdown of recent appointments)
- Optional: select who made the sale (`sold_by`)
- Optional notes
- "Total vente" shown live as products are added (sum of `selling_price × quantity`)
- Submit → calls `POST /api/sales`
- Success: show confirmation + "Nouvelle vente" button to record another

---

### `/dashboard/ventes/historique`
Sales history log.

**Features:**
- Table: date, product, brand, qty, unit price, total, margin, linked appointment (if any), sold by
- Date range filter (default: current month)
- Summary row at bottom: total revenue, total margin for the period
- Export to CSV (client-side, from fetched data)

**Data source:** `GET /api/sales`

---

## 6. Low-Stock Dashboard Alert

On `/dashboard/products`, show a banner at the top if any active product has `stock_quantity <= low_stock_threshold`:

```
⚠️ 2 produits en stock bas — Voir les produits concernés
```

Clicking the banner filters the list to low-stock items only.

The `PendingBadge` pattern from V1 can be reused: a small React component that fetches the low-stock count from Supabase on mount with a real-time subscription on the `products` table.

---

## 7. Email Templates

### Low-stock alert (→ manager)
**Subject:** `⚠️ Stock bas — {product_name}`
**Body:**
```
Le produit "{name}" ({brand}) est en stock bas.

Stock actuel : {stock_quantity} unité(s)
Seuil d'alerte : {low_stock_threshold} unité(s)

Pensez à réapprovisionner.

— Brazilian Studio Rabat
```

---

## 8. Navigation Updates

Add to the existing sidebar in `src/app/dashboard/layout.tsx`:
- **Produits** (icon: Package) → `/dashboard/products`
- **Ventes** (icon: ShoppingBag) → `/dashboard/ventes/new`
- **Historique ventes** (icon: BarChart2) → `/dashboard/ventes/historique`

Low-stock badge on the **Produits** nav item (same pattern as pending badge on Calendrier).

---

## 9. Tech Stack (additions to V1)

No new dependencies needed:
- Database: existing Supabase project (new tables via migration)
- Email: existing Resend client
- Icons: existing `lucide-react` (Package, ShoppingBag, BarChart2 icons)
- CSV export: native `Blob` + `URL.createObjectURL` (no library needed)

---

## 10. Migration File

New file: `supabase/migrations/002_products_inventory.sql`

Contains:
1. `CREATE TABLE products`
2. `CREATE TABLE product_sales`
3. RLS policies for both tables
4. Seed data: 3 example products (for testing)

---

## 11. Security Notes

- `buying_price` is stored in the database and readable by staff (RLS: `is_staff()`)
- Public RLS policy on `products` only allows SELECT on active products — no price columns specified, so buying_price is readable if someone queries directly. **Mitigation:** the public policy should only expose needed columns. Use a view or column-level security if needed. For V2 simplicity, restrict the public read policy to exclude `buying_price` using a view.
- All write operations go through API routes (service_role key) — buying_price never computed client-side

**Recommended:** Create a `products_public` view for anonymous reads:
```sql
CREATE VIEW products_public AS
  SELECT id, name, brand, selling_price, is_active
  FROM products
  WHERE is_active = true;
```
And update RLS so anonymous users query the view, not the table directly.

---

## 12. V3 Preview (Devis & Factures)

V2 lays the groundwork for V3:
- `product_sales.unit_price` snapshot enables accurate invoice line items
- `product_sales.appointment_id` links products to the appointment being invoiced
- `products` catalog provides the product library for devis line items
