import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture, error } = await supabase
      .from('factures')
      .select(`id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
               client_id, devis_id, appointment_id,
               clients(name, phone, email), facture_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (error || !facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const items = ((facture as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, facture.tva_rate)
    const docData = { ...facture, items, ...totals, clients: (facture as any).clients }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'facture' }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${facture.number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('GET /api/factures/[id]/pdf error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
