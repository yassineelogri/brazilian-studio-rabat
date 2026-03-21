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
    const { facture_items: _raw, ...factureData } = data as any
    return NextResponse.json({ ...factureData, items, ...computeTotals(items, data.tva_rate) })
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
    if (notes !== undefined) updates.notes = notes?.trim() || null
    if (tva_rate !== undefined) {
      if (isNaN(Number(tva_rate)) || Number(tva_rate) < 0 || Number(tva_rate) > 100) {
        return NextResponse.json({ error: 'tva_rate must be between 0 and 100' }, { status: 422 })
      }
      updates.tva_rate = Number(tva_rate)
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('factures').update(updates).eq('id', params.id)
    }
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
    if (error || !data) throw error ?? new Error('fetchFactureWithItems returned no data after PATCH')
    const sortedItems = ((data as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const { facture_items: _rawPatch, ...factureData } = data as any
    return NextResponse.json({ ...factureData, items: sortedItems, ...computeTotals(sortedItems, data.tva_rate) })
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
