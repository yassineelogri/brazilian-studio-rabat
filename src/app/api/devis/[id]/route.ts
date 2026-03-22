import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

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

    const { devis_items: _raw, ...devisData } = data as any
    return NextResponse.json({
      ...devisData,
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
    if (tva_rate !== undefined) {
      if (isNaN(Number(tva_rate)) || Number(tva_rate) < 0 || Number(tva_rate) > 100) {
        return NextResponse.json({ error: 'tva_rate must be between 0 and 100' }, { status: 422 })
      }
      updates.tva_rate = Number(tva_rate)
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase.from('devis').update(updates).eq('id', params.id)
      if (updateErr) throw updateErr
    }

    // Full replacement of items if provided
    if (Array.isArray(items)) {
      if (items.length === 0) return NextResponse.json({ error: 'items must not be empty' }, { status: 422 })
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
    if (error || !data) throw error ?? new Error('fetchDevisWithItems returned no data after PATCH')

    const sortedItems = ((data as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(sortedItems, data.tva_rate)

    const { devis_items: _rawPatch, ...devisDataPatch } = data as any
    return NextResponse.json({ ...devisDataPatch, items: sortedItems, ...totals })
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
