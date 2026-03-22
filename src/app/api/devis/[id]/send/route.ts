export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff, computeTotals } from '@/lib/api-helpers'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { DocumentTemplate } from '@/components/pdf/DocumentTemplate'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { devisEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis')
      .select(`id, number, status, tva_rate, valid_until, notes, events, created_at, client_id, appointment_id,
               clients(name, phone, email), devis_items(id, description, quantity, unit_price, sort_order)`)
      .eq('id', params.id)
      .single()

    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (!['draft', 'sent'].includes(devis.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const emailOverride = body?.email
    const client = (devis as any).clients
    const toEmail = emailOverride || client?.email

    if (!toEmail) return NextResponse.json({ error: 'no_email' }, { status: 422 })

    const items = ((devis as any).devis_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const totals = computeTotals(items, devis.tva_rate)
    const docData = { ...devis, status: 'sent', items, ...totals, clients: client }

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      React.createElement(DocumentTemplate, { doc: docData as any, type: 'devis' }) as any
    )

    // Update status + append event
    const newEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'sent' }]
    await supabase.from('devis').update({ status: 'sent', events: newEvents }).eq('id', params.id)

    // Send email
    const template = devisEmail({
      clientName: client?.name ?? 'Client',
      number: devis.number,
      totalTtc: totals.total_ttc,
      validUntil: devis.valid_until,
    })
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: [toEmail],
      subject: template.subject,
      html: template.html,
      attachments: [{ filename: `${devis.number}.pdf`, content: buffer }],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/devis/[id]/send error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
