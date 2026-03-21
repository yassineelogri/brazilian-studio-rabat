import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, status, events, client_id, appointment_id, tva_rate, notes,
               devis_items(description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(devis.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // Mark devis as accepted
    const devisEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'accepted' }]
    await supabase.from('devis').update({ status: 'accepted', events: devisEvents }).eq('id', params.id)

    // Generate facture number
    const { data: factureNumber, error: numErr } = await supabase.rpc('generate_facture_number')
    if (numErr) throw numErr

    const factureEvent = { at: new Date().toISOString(), by: staff.id, status: 'draft' }

    // Create facture
    const { data: facture, error: factureErr } = await supabase
      .from('factures')
      .insert({
        number: factureNumber as string,
        client_id: devis.client_id,
        devis_id: params.id,
        appointment_id: devis.appointment_id,
        tva_rate: devis.tva_rate,
        notes: devis.notes,
        events: [factureEvent],
      })
      .select()
      .single()
    if (factureErr) throw factureErr

    // Copy items
    const itemRows = ((devis as any).devis_items || []).map((item: any) => ({
      facture_id: facture.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: item.sort_order,
    }))
    const { error: itemsErr } = await supabase.from('facture_items').insert(itemRows)
    if (itemsErr) throw itemsErr

    return NextResponse.json(facture, { status: 201 })
  } catch (err) {
    console.error('POST /api/devis/[id]/convert error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
