export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSessionSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { lowStockEmail } from '@/lib/email-templates'

async function requireStaff() {
  const session = await createSessionSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
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

    // Insert sales rows
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
