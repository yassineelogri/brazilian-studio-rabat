export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals, projectDevisStatus } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'

async function fetchLogoBase64(request: NextRequest): Promise<string | null> {
  try {
    const origin = new URL(request.url).origin
    const res = await fetch(`${origin}/logo-black.png`)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error } = await supabase
      .from('devis')
      .select(`id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
               rdv_date, avance_amount, avance_paid, payment_mode,
               clients(name, phone, email), devis_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()
    if (error || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const items = ((devis as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, devis.tva_rate)
    const docData = {
      ...devis,
      status: projectDevisStatus(devis.status, (devis as any).valid_until),
      items,
      ...totals,
      clients: (devis as any).clients,
    }
    const logoBase64 = await fetchLogoBase64(request)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'devis', logoBase64 }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${devis.number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('GET /api/devis/[id]/pdf error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
