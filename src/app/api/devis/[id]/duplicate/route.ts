export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: source, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, client_id, appointment_id, tva_rate, notes, valid_until,
               devis_items(description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (fetchErr || !source) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const { data: newNumber, error: numErr } = await supabase.rpc('generate_devis_number')
    if (numErr) throw numErr

    const { data: newDevis, error: devisErr } = await supabase
      .from('devis')
      .insert({
        number: newNumber as string,
        client_id: source.client_id,
        appointment_id: source.appointment_id,
        tva_rate: source.tva_rate,
        notes: source.notes,
        valid_until: source.valid_until,
        events: [{ at: new Date().toISOString(), by: staff.id, status: 'draft' }],
      })
      .select()
      .single()
    if (devisErr) throw devisErr

    const itemRows = ((source as any).devis_items || []).map((item: any) => ({
      devis_id: newDevis.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order,
    }))
    await supabase.from('devis_items').insert(itemRows)

    return NextResponse.json(newDevis, { status: 201 })
  } catch (err) {
    console.error('POST /api/devis/[id]/duplicate error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
