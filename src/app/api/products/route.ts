import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSessionSupabaseClient } from '@/lib/supabase/server'

// Helper: verify caller is an authenticated staff member
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
