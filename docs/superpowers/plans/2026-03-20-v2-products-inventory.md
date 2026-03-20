# V2 Products & Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product catalog management, sales recording (appointment-linked or walk-in), stock tracking, and low-stock alerts to the Brazilian Studio Rabat dashboard.

**Architecture:** Same hybrid as V1 — reads go browser→Supabase (RLS enforced), writes go through Next.js API routes with service_role key. Two new DB tables: `products` and `product_sales`. No new npm dependencies needed.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + RLS), Resend (email), lucide-react (icons already installed)

**Working directory:** `C:/Users/yassi/.gemini/antigravity/scratch/brazilian_studio/.worktrees/feature/v1-appointments`

**Spec:** `docs/superpowers/specs/2026-03-20-v2-products-inventory-design.md`

---

## File Map

**New files:**
- `supabase/migrations/002_products_inventory.sql` — DB tables, RLS, view, seed data
- `src/lib/supabase/types.ts` — add Product, ProductSale interfaces (modify existing)
- `src/lib/email-templates.ts` — add lowStockEmail function (modify existing)
- `src/app/api/products/route.ts` — POST (create product)
- `src/app/api/products/[id]/route.ts` — PATCH (update), DELETE
- `src/app/api/sales/route.ts` — POST (record sale), GET (sales history)
- `src/components/dashboard/LowStockBadge.tsx` — real-time badge for sidebar
- `src/app/dashboard/products/page.tsx` — product catalog page
- `src/app/dashboard/ventes/new/page.tsx` — record sale form
- `src/app/dashboard/ventes/historique/page.tsx` — sales history log

**Modified files:**
- `src/app/dashboard/layout.tsx` — add 3 new nav items + LowStockBadge
- `src/lib/supabase/types.ts` — add Product, ProductSale types + update Database type

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/002_products_inventory.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/002_products_inventory.sql
-- Note: is_staff() function already defined in migration 001 — do not redefine.

-- Atomic stock decrement function (prevents race conditions)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void AS $$
  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id AND stock_quantity >= p_quantity;
$$ LANGUAGE sql SECURITY DEFINER;

-- Products table
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

-- Product sales table
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

-- Public view: hides buying_price from anonymous users
CREATE VIEW products_public AS
  SELECT id, name, brand, selling_price, is_active
  FROM products
  WHERE is_active = true;

-- RLS: products table staff-only
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage products"
  ON products FOR ALL
  USING (is_staff());

-- RLS: product_sales staff-only
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage product_sales"
  ON product_sales FOR ALL
  USING (is_staff());

-- Seed data: 3 test products
INSERT INTO products (name, brand, buying_price, selling_price, stock_quantity, low_stock_threshold) VALUES
  ('OPI Nail Polish — Red', 'OPI', 45.00, 120.00, 10, 3),
  ('Lissage Brésilien Kit', 'Inoar', 280.00, 650.00, 5, 2),
  ('Crème Hydratante Visage', 'The Ordinary', 35.00, 95.00, 8, 3);
```

- [ ] **Step 2: Run the migration in Supabase SQL Editor**

Go to your Supabase project → SQL Editor → paste the file contents → Run.

Expected: "Success. No rows returned" for each statement.

Verify in Table Editor: `products` and `product_sales` tables exist with correct columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_products_inventory.sql
git commit -m "feat: add products and product_sales tables with RLS"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Add Product and ProductSale interfaces**

Add after the `Notification` interface (before the `DBRelationship` type):

```typescript
export interface Product {
  [key: string]: unknown
  id: string
  name: string
  brand: string | null
  buying_price: number
  selling_price: number
  stock_quantity: number
  low_stock_threshold: number
  is_active: boolean
  created_at: string
}

export interface ProductSale {
  [key: string]: unknown
  id: string
  product_id: string
  appointment_id: string | null
  quantity: number
  unit_price: number
  sold_by: string | null
  sold_at: string
  notes: string | null
}

export interface ProductSaleWithRelations extends ProductSale {
  product: Pick<Product, 'id' | 'name' | 'brand'>
  staff: Pick<Staff, 'id' | 'name'> | null
  total: number
  margin_per_unit: number
  margin_total: number
}
```

- [ ] **Step 2: Update the Database type**

In the `Tables` object inside the `Database` type, add after the `notifications` entry:

```typescript
products:      { Row: Product;     Insert: Omit<Product, 'id' | 'created_at'>;      Update: Partial<Omit<Product, 'id'>>;      Relationships: DBRelationship[] }
product_sales: { Row: ProductSale; Insert: Omit<ProductSale, 'id'>;                 Update: Partial<Omit<ProductSale, 'id'>>; Relationships: DBRelationship[] }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add Product and ProductSale TypeScript types"
```

---

## Task 3: Low-Stock Email Template

**Files:**
- Modify: `src/lib/email-templates.ts`

- [ ] **Step 1: Add lowStockEmail function**

Append to the end of `src/lib/email-templates.ts`:

```typescript
export function lowStockEmail(data: {
  productName: string
  brand: string | null
  stockQuantity: number
  lowStockThreshold: number
}) {
  const brandText = data.brand ? ` (${data.brand})` : ''
  return {
    subject: `⚠️ Stock bas — ${data.productName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #B76E79;">⚠️ Alerte stock bas</h2>
        <p>Le produit <strong>${data.productName}${brandText}</strong> est en stock bas.</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Stock actuel</td><td><strong>${data.stockQuantity} unité(s)</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Seuil d'alerte</td><td><strong>${data.lowStockThreshold} unité(s)</strong></td></tr>
        </table>
        <p style="margin-top: 16px;">Pensez à réapprovisionner.</p>
        <p style="color: #999; font-size: 14px;">— Brazilian Studio Rabat</p>
      </div>
    `,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email-templates.ts
git commit -m "feat: add low-stock email template"
```

---

## Task 4: Products API Routes

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/products/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAnonSupabaseClient } from '@/lib/supabase/server'

// Helper: verify caller is an authenticated staff member
async function requireStaff() {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('staff').select('id').eq('auth_user_id', user.id).eq('is_active', true).single()
  return data ?? null
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, brand, buying_price, selling_price, stock_quantity, low_stock_threshold } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 422 })
    }
    if (buying_price === undefined || buying_price === null || isNaN(Number(buying_price)) || Number(buying_price) < 0) {
      return NextResponse.json({ error: 'buying_price must be >= 0' }, { status: 422 })
    }
    if (selling_price === undefined || selling_price === null || isNaN(Number(selling_price)) || Number(selling_price) < 0) {
      return NextResponse.json({ error: 'selling_price must be >= 0' }, { status: 422 })
    }
    if (stock_quantity !== undefined && (!Number.isInteger(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
      return NextResponse.json({ error: 'stock_quantity must be a non-negative integer' }, { status: 422 })
    }
    if (low_stock_threshold !== undefined && (!Number.isInteger(Number(low_stock_threshold)) || Number(low_stock_threshold) < 0)) {
      return NextResponse.json({ error: 'low_stock_threshold must be a non-negative integer' }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        brand: brand?.trim() || null,
        buying_price: Number(buying_price),
        selling_price: Number(selling_price),
        stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : 0,
        low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : 3,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/products error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `src/app/api/products/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAnonSupabaseClient } from '@/lib/supabase/server'

async function requireStaff() {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('staff').select('id').eq('auth_user_id', user.id).eq('is_active', true).single()
  return data ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const body = await request.json()
    const allowed = ['name', 'brand', 'buying_price', 'selling_price', 'stock_quantity', 'low_stock_threshold', 'is_active']
    const updates: Record<string, unknown> = {}

    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no valid fields to update' }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/products/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const supabase = createServerSupabaseClient()

    // Check for sales history
    const { count } = await supabase
      .from('product_sales')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', params.id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'has_sales', message: 'Ce produit a des ventes associées. Désactivez-le plutôt que de le supprimer.' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/products/[id] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: builds successfully, `/api/products` and `/api/products/[id]` routes appear.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/products/
git commit -m "feat: add products API routes (POST, PATCH, DELETE)"
```

---

## Task 5: Sales API Routes

**Files:**
- Create: `src/app/api/sales/route.ts`

- [ ] **Step 1: Create `src/app/api/sales/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAnonSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { lowStockEmail } from '@/lib/email-templates'

async function requireStaff() {
  const anon = createAnonSupabaseClient()
  const { data: { user } } = await anon.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('staff').select('id').eq('auth_user_id', user.id).eq('is_active', true).single()
  return data ?? null
}

export async function POST(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const body = await request.json()
    const { items, appointment_id, sold_by, notes } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch all products being sold
    const productIds = items.map((i: { product_id: string }) => i.product_id)
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, brand, selling_price, buying_price, stock_quantity, low_stock_threshold, is_active')
      .in('id', productIds)

    if (fetchError) throw fetchError

    // Validate all products exist and are active
    for (const item of items) {
      const product = products?.find(p => p.id === item.product_id)
      if (!product || !product.is_active) {
        return NextResponse.json({ error: 'product_not_found', product_id: item.product_id }, { status: 404 })
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({
          error: 'insufficient_stock',
          product_id: item.product_id,
          available: product.stock_quantity,
          requested: item.quantity,
        }, { status: 422 })
      }
    }

    // Insert sales rows and decrement stock
    const saleRows = items.map((item: { product_id: string; quantity: number }) => {
      const product = products!.find(p => p.id === item.product_id)!
      return {
        product_id: item.product_id,
        appointment_id: appointment_id || null,
        quantity: item.quantity,
        unit_price: product.selling_price,
        sold_by: sold_by || null,
        notes: notes || null,
      }
    })

    const { data: sales, error: insertError } = await supabase
      .from('product_sales')
      .insert(saleRows)
      .select()

    if (insertError) throw insertError

    // Atomically decrement stock using RPC (prevents race conditions)
    for (const item of items) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }

    // Check low-stock and send alerts (non-fatal)
    for (const item of items) {
      const product = products!.find(p => p.id === item.product_id)!
      const newStock = product.stock_quantity - item.quantity
      if (newStock <= product.low_stock_threshold && NOTIFY_EMAILS.length > 0) {
        const emailContent = lowStockEmail({
          productName: product.name,
          brand: product.brand,
          stockQuantity: newStock,
          lowStockThreshold: product.low_stock_threshold,
        })
        resend.emails.send({
          from: 'onboarding@resend.dev',
          to: [NOTIFY_EMAILS[0]], // manager only
          subject: emailContent.subject,
          html: emailContent.html,
        }).catch(err => console.error('Low-stock email failed:', err))
      }
    }

    return NextResponse.json(sales, { status: 201 })
  } catch (err) {
    console.error('POST /api/sales error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const to = searchParams.get('to') || new Date().toISOString()
    const productId = searchParams.get('product_id')
    const appointmentId = searchParams.get('appointment_id')

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('product_sales')
      .select(`
        id, quantity, unit_price, appointment_id, sold_at, notes,
        product:products(id, name, brand, buying_price),
        sold_by:staff(id, name)
      `)
      .gte('sold_at', from)
      .lte('sold_at', to)
      .order('sold_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)
    if (appointmentId) query = query.eq('appointment_id', appointmentId)

    const { data, error } = await query
    if (error) throw error

    // Compute margin server-side, never expose buying_price
    const result = (data || []).map((sale: any) => ({
      id: sale.id,
      sold_at: sale.sold_at,
      product: { id: sale.product.id, name: sale.product.name, brand: sale.product.brand },
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      total: sale.unit_price * sale.quantity,
      margin_per_unit: sale.unit_price - sale.product.buying_price,
      margin_total: (sale.unit_price - sale.product.buying_price) * sale.quantity,
      appointment_id: sale.appointment_id,
      sold_by: sale.sold_by,
      notes: sale.notes,
    }))

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('GET /api/sales error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully, `/api/sales` route appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sales/
git commit -m "feat: add sales API routes (POST record sale, GET history)"
```

---

## Task 6: LowStockBadge Component

**Files:**
- Create: `src/components/dashboard/LowStockBadge.tsx`

- [ ] **Step 1: Create `src/components/dashboard/LowStockBadge.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LowStockBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCount() {
      const { data } = await supabase
        .from('products')
        .select('id, stock_quantity, low_stock_threshold')
        .eq('is_active', true)

      if (data) {
        const lowStock = data.filter(p => p.stock_quantity <= p.low_stock_threshold)
        setCount(lowStock.length)
      }
    }

    fetchCount()

    const channel = supabase
      .channel('low_stock_products')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
      }, () => fetchCount())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
      {count}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/LowStockBadge.tsx
git commit -m "feat: add LowStockBadge component with real-time subscription"
```

---

## Task 7: Update Dashboard Sidebar Navigation

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Update imports and nav items**

Replace the top of `src/app/dashboard/layout.tsx` (imports + navItems) with:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, Package, ShoppingBag, BarChart2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PendingBadge from '@/components/dashboard/PendingBadge'
import LowStockBadge from '@/components/dashboard/LowStockBadge'

const navItems = [
  { href: '/dashboard/calendar',              label: 'Calendrier',        icon: Calendar,    badge: 'pending' },
  { href: '/dashboard/appointments/new',      label: 'Nouveau RDV',       icon: Plus,        badge: null },
  { href: '/dashboard/staff',                 label: 'Staff',             icon: Users,       badge: null },
  { href: '/dashboard/services',              label: 'Prestations',       icon: Scissors,    badge: null },
  { href: '/dashboard/products',              label: 'Produits',          icon: Package,     badge: 'lowstock' },
  { href: '/dashboard/ventes/new',            label: 'Ventes',            icon: ShoppingBag, badge: null },
  { href: '/dashboard/ventes/historique',     label: 'Historique ventes', icon: BarChart2,   badge: null },
]
```

- [ ] **Step 2: Update the nav link render to use the badge field**

Replace the `<Link>` block inside the `navItems.map(...)` call:

```typescript
{navItems.map(({ href, label, icon: Icon, badge }) => {
  const active = pathname.startsWith(href)
  return (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
        active
          ? 'bg-salon-pink text-salon-dark'
          : 'text-salon-muted hover:bg-salon-cream hover:text-salon-dark'
      }`}
    >
      <Icon size={16} />
      {label}
      {badge === 'pending' && <PendingBadge />}
      {badge === 'lowstock' && <LowStockBadge />}
    </Link>
  )
})}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: add Produits, Ventes, Historique nav items with low-stock badge"
```

---

## Task 8: Products Page

**Files:**
- Create: `src/app/dashboard/products/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/products/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/lib/supabase/types'
import { Package, Plus, AlertTriangle, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' })
  const [error, setError] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)

  const supabase = createClient()

  async function fetchProducts() {
    const query = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!showAll) query.eq('is_active', true)
    const { data } = await query
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [showAll])

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold)
  const displayed = filterLowStock ? lowStockProducts : products

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const method = editProduct ? 'PATCH' : 'POST'
    const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        brand: form.brand || null,
        buying_price: parseFloat(form.buying_price),
        selling_price: parseFloat(form.selling_price),
        stock_quantity: parseInt(form.stock_quantity),
        low_stock_threshold: parseInt(form.low_stock_threshold),
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erreur')
      return
    }
    setShowForm(false)
    setEditProduct(null)
    setForm({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' })
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.status === 409) {
      alert('Ce produit a des ventes. Désactivez-le plutôt que de le supprimer.')
      return
    }
    fetchProducts()
  }

  async function handleToggleActive(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !product.is_active }),
    })
    fetchProducts()
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      name: product.name,
      brand: product.brand || '',
      buying_price: String(product.buying_price),
      selling_price: String(product.selling_price),
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
    })
    setShowForm(true)
  }

  const margin = (p: Product) => p.selling_price > 0
    ? Math.round(((p.selling_price - p.buying_price) / p.selling_price) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2">
          <Package size={20} /> Produits
        </h1>
        <button
          onClick={() => { setEditProduct(null); setForm({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' }); setShowForm(true) }}
          className="flex items-center gap-2 bg-salon-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={14} /> Ajouter un produit
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className="w-full flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 hover:bg-red-100 transition"
        >
          <AlertTriangle size={16} />
          {lowStockProducts.length} produit(s) en stock bas — {filterLowStock ? 'Voir tous' : 'Voir les produits concernés'}
        </button>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-salon-muted flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
          Afficher les produits désactivés
        </label>
      </div>

      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : displayed.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucun produit.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-left px-4 py-3">Marque</th>
                <th className="text-right px-4 py-3">Prix achat</th>
                <th className="text-right px-4 py-3">Prix vente</th>
                <th className="text-right px-4 py-3">Marge %</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-rose/10">
              {displayed.map(product => (
                <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-salon-dark">{product.name}</td>
                  <td className="px-4 py-3 text-salon-muted">{product.brand || '—'}</td>
                  <td className="px-4 py-3 text-right text-salon-muted">{product.buying_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right font-medium text-salon-dark">{product.selling_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${margin(product) >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                      {margin(product)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${product.stock_quantity <= product.low_stock_threshold ? 'text-red-600' : 'text-salon-dark'}`}>
                      {product.stock_quantity}
                      {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(product)} className="text-salon-muted hover:text-salon-dark transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleToggleActive(product)} className="text-salon-muted hover:text-salon-dark transition" title={product.is_active ? 'Désactiver' : 'Activer'}>
                        {product.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-salon-muted hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit form slide-over */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-salon-dark mb-6">
              {editProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-salon-dark mb-1">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-salon-dark mb-1">Marque</label>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Prix achat (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} required
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Prix vente (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} required
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Stock actuel</label>
                  <input type="number" min="0" step="1" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Seuil alerte stock</label>
                  <input type="number" min="0" step="1" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-salon-gold text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                  {editProduct ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditProduct(null) }}
                  className="flex-1 border border-salon-rose/30 text-salon-muted py-2 rounded-lg text-sm hover:bg-salon-cream transition">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully, `/dashboard/products` appears in build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/products/
git commit -m "feat: add products management page with low-stock alerts"
```

---

## Task 9: New Sale Page

**Files:**
- Create: `src/app/dashboard/ventes/new/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/ventes/new/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, AppointmentWithRelations } from '@/lib/supabase/types'
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle } from 'lucide-react'

interface SaleItem {
  product: Product
  quantity: number
}

export default function NewVentePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [appointmentId, setAppointmentId] = useState('')
  const [soldBy, setSoldBy] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []))
    supabase.from('appointments').select('*, clients(name, phone), services(name, color), staff(name)')
      .in('status', ['pending', 'confirmed']).order('date', { ascending: false }).limit(50)
      .then(({ data }) => setAppointments((data as unknown as AppointmentWithRelations[]) || []))
    supabase.from('staff').select('id, name').eq('is_active', true).then(({ data }) => setStaff(data || []))
  }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  )

  function addItem(product: Product) {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    setSearch('')
  }

  function updateQty(productId: string, delta: number) {
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.product.selling_price * i.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { setError('Ajoutez au moins un produit.'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        appointment_id: appointmentId || null,
        sold_by: soldBy || null,
        notes: notes || null,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'insufficient_stock') {
        setError(`Stock insuffisant pour ce produit (disponible: ${data.available}, demandé: ${data.requested})`)
      } else {
        setError(data.message || data.error || 'Erreur lors de l\'enregistrement.')
      }
      return
    }

    setSuccess(true)
    setItems([])
    setAppointmentId('')
    setSoldBy('')
    setNotes('')
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle size={48} className="text-green-500" />
        <p className="text-lg font-medium text-salon-dark">Vente enregistrée !</p>
        <button onClick={() => setSuccess(false)} className="bg-salon-gold text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
          Nouvelle vente
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2 mb-6">
        <ShoppingBag size={20} /> Enregistrer une vente
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product search */}
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-2">Rechercher un produit</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou marque..."
            className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50"
          />
          {search && (
            <div className="border border-salon-rose/20 rounded-lg mt-1 bg-white shadow-sm max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-2 text-sm text-salon-muted">Aucun produit trouvé</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-salon-cream text-left transition">
                  <span className="font-medium">{p.name} {p.brand && <span className="text-salon-muted">— {p.brand}</span>}</span>
                  <span className="text-salon-muted">Stock: {p.stock_quantity} | {p.selling_price.toFixed(2)} DH</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Produit</th>
                  <th className="text-right px-4 py-3">Prix</th>
                  <th className="text-center px-4 py-3">Qté</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-rose/10">
                {items.map(({ product, quantity }) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium text-salon-dark">{product.name}</td>
                    <td className="px-4 py-3 text-right text-salon-muted">{product.selling_price.toFixed(2)} DH</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateQty(product.id, -1)} className="text-salon-muted hover:text-salon-dark"><Minus size={12} /></button>
                        <span className="w-6 text-center font-medium">{quantity}</span>
                        <button type="button" onClick={() => updateQty(product.id, 1)} disabled={quantity >= product.stock_quantity}
                          className="text-salon-muted hover:text-salon-dark disabled:opacity-30"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{(product.selling_price * quantity).toFixed(2)} DH</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => removeItem(product.id)} className="text-salon-muted hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-salon-cream">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-salon-dark">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-salon-dark">{total.toFixed(2)} DH</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-salon-dark mb-1">Lier à un RDV (optionnel)</label>
            <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)}
              className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50">
              <option value="">— Vente indépendante —</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.date} {a.start_time} — {(a.clients as any)?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-salon-dark mb-1">Vendu par (optionnel)</label>
            <select value={soldBy} onChange={e => setSoldBy(e.target.value)}
              className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading || items.length === 0}
          className="w-full bg-salon-gold text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
          {loading ? 'Enregistrement...' : `Enregistrer la vente — ${total.toFixed(2)} DH`}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully, `/dashboard/ventes/new` appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/ventes/
git commit -m "feat: add new sale page with product search and stock check"
```

---

## Task 10: Sales History Page

**Files:**
- Create: `src/app/dashboard/ventes/historique/page.tsx`

- [ ] **Step 1: Create `src/app/dashboard/ventes/historique/page.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { ProductSaleWithRelations } from '@/lib/supabase/types'

export default function HistoriquePage() {
  const [sales, setSales] = useState<ProductSaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(now.toISOString().slice(0, 10))

  async function fetchSales() {
    setLoading(true)
    const res = await fetch(`/api/sales?from=${from}T00:00:00Z&to=${to}T23:59:59Z`)
    const data = await res.json()
    setSales(data)
    setLoading(false)
  }

  useEffect(() => { fetchSales() }, [from, to])

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const totalMargin = sales.reduce((sum, s) => sum + s.margin_total, 0)

  function exportCSV() {
    const header = 'Date,Produit,Marque,Quantité,Prix unitaire,Total,Marge,RDV lié,Vendu par\n'
    const rows = sales.map(s =>
      [
        new Date(s.sold_at).toLocaleDateString('fr-FR'),
        s.product.name,
        s.product.brand || '',
        s.quantity,
        s.unit_price.toFixed(2),
        s.total.toFixed(2),
        s.margin_total.toFixed(2),
        s.appointment_id ? 'Oui' : 'Non',
        (s.sold_by as any)?.name || '',
      ].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventes_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2">
          <BarChart2 size={20} /> Historique des ventes
        </h1>
        {sales.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 border border-salon-rose/30 text-salon-muted px-4 py-2 rounded-lg text-sm hover:bg-salon-cream transition">
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>

      {/* Date filters */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-salon-muted mb-1">Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-salon-rose/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>
        <div>
          <label className="block text-xs text-salon-muted mb-1">Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-salon-rose/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>
      </div>

      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : sales.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucune vente sur cette période.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-left px-4 py-3">Marque</th>
                <th className="text-right px-4 py-3">Qté</th>
                <th className="text-right px-4 py-3">Prix unit.</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Marge</th>
                <th className="text-left px-4 py-3">RDV</th>
                <th className="text-left px-4 py-3">Vendu par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-rose/10">
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td className="px-4 py-3 text-salon-muted whitespace-nowrap">
                    {new Date(sale.sold_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-medium text-salon-dark">{sale.product.name}</td>
                  <td className="px-4 py-3 text-salon-muted">{sale.product.brand || '—'}</td>
                  <td className="px-4 py-3 text-right">{sale.quantity}</td>
                  <td className="px-4 py-3 text-right text-salon-muted">{sale.unit_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right font-medium">{sale.total.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{sale.margin_total.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-salon-muted">{sale.appointment_id ? '🔗 Oui' : '—'}</td>
                  <td className="px-4 py-3 text-salon-muted">{(sale.sold_by as any)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-salon-cream font-semibold">
                <td colSpan={5} className="px-4 py-3 text-right text-salon-dark">Totaux</td>
                <td className="px-4 py-3 text-right text-salon-dark">{totalRevenue.toFixed(2)} DH</td>
                <td className="px-4 py-3 text-right text-green-600">{totalMargin.toFixed(2)} DH</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: builds successfully, all 3 new dashboard pages appear in build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/ventes/historique/
git commit -m "feat: add sales history page with date filter and CSV export"
```

---

## Task 11: Final Build + Push

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: 0 errors, 0 TypeScript errors. All pages listed.

- [ ] **Step 2: Push**

```bash
git push origin feature/v1-appointments
```

- [ ] **Step 3: Manual test checklist**

In Vercel preview URL:

1. Go to `/dashboard/products` → add a product (e.g. OPI Nail Polish, buy: 45, sell: 120, stock: 5, threshold: 3)
2. Go to `/dashboard/ventes/new` → search "OPI" → add 1 unit → submit
3. Go back to `/dashboard/products` → stock should be 4
4. Add a product with stock = 2, threshold = 3 → low-stock banner should appear + red badge on sidebar
5. Go to `/dashboard/ventes/historique` → sale should appear with total + margin
6. Click "Exporter CSV" → CSV file downloads
7. Try to delete a product with sales → should show "has_sales" error message
