export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import type { FactureStatus } from '@/lib/supabase/types'

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
    if (tva_rate !== undefined && (isNaN(Number(tva_rate)) || Number(tva_rate) < 0 || Number(tva_rate) > 100)) {
      return NextResponse.json({ error: 'tva_rate must be between 0 and 100' }, { status: 422 })
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

    if (status)   query = query.eq('status', status as FactureStatus)
    if (clientId) query = query.eq('client_id', clientId)
    if (from)     query = query.gte('created_at', from)
    if (to)       query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error

    const allItems = (data || [])
      .filter((f: any) => {
        if (!search) return true
        const q = search.toLowerCase()
        return f.number.toLowerCase().includes(q) || f.clients?.name?.toLowerCase().includes(q)
      })
      .map((f: any) => {
        const items = (f.facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        const totals = computeTotals(items, f.tva_rate)
        const { facture_items: _raw, ...factureData } = f
        return { ...factureData, items, ...totals }
      })

    // Revenue summary: paid factures only
    const paidItems = allItems.filter((f: any) => f.status === 'paid')
    const summary = {
      subtotal_ht: Math.round(paidItems.reduce((s: number, f: any) => s + f.subtotal_ht, 0) * 100) / 100,
      tva_amount:  Math.round(paidItems.reduce((s: number, f: any) => s + f.tva_amount,  0) * 100) / 100,
      total_ttc:   Math.round(paidItems.reduce((s: number, f: any) => s + f.total_ttc,   0) * 100) / 100,
    }

    return NextResponse.json({ items: allItems, summary })
  } catch (err) {
    console.error('GET /api/factures error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
