import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'
import { resend } from '@/lib/resend'
import { factureEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture, error: fetchErr } = await supabase
      .from('factures')
      .select(`id, number, status, tva_rate, notes, paid_at, paid_amount, payment_method, events, created_at,
               client_id, devis_id, appointment_id, clients(name, phone, email),
               facture_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()

    if (fetchErr || !facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(facture.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const client = (facture as any).clients
    const toEmail = body?.email || client?.email
    if (!toEmail) return NextResponse.json({ error: 'no_email' }, { status: 422 })

    const items = ((facture as any).facture_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, facture.tva_rate)
    const docData = { ...facture, status: 'sent', items, ...totals, clients: client }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'facture' }) as any
    )

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'sent' }]
    await supabase.from('factures').update({ status: 'sent', events: newEvents }).eq('id', params.id)

    const template = factureEmail({ clientName: client?.name ?? 'Client', number: facture.number, totalTtc: totals.total_ttc })
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [toEmail],
      subject: template.subject,
      html: template.html,
      attachments: [{ filename: `${facture.number}.pdf`, content: buffer }],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/send error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
