export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const supabase = createServerSupabaseClient()

  // Coerce numeric fields if present
  const updates: Record<string, unknown> = { ...body }
  if (updates.price != null) updates.price = Number(updates.price)
  if (updates.original_price != null) updates.original_price = Number(updates.original_price)

  const { data, error } = await supabase
    .from('pricing_items')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('pricing_items')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
