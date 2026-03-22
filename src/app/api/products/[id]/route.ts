import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createSessionSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireStaff() {
  const session = await createSessionSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
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
