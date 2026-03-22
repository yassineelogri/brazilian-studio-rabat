import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'
import type { DevisStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

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
      query = query.eq('status', status as DevisStatus)
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
