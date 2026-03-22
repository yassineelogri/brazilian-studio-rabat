export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    // Resolve token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('booking_tokens')
      .select('appointment_id, expires_at, client_id')
      .eq('token', params.token)
      .single()

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 410 })
    }

    // Fetch appointment
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, status, starts_at, date, start_time, services:service_id(name), clients:client_id(name, email)')
      .eq('id', tokenRow.appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Idempotent
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Status guard
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // 24h guard
    const startsAt = new Date(appointment.starts_at as string).getTime()
    if (startsAt - Date.now() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'too_late_to_cancel' }, { status: 422 })
    }

    // Cancel
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', tokenRow.appointment_id)

    if (updateError) throw updateError

    const { error: notifError } = await supabase.from('notifications').insert({
      appointment_id: tokenRow.appointment_id,
      type: 'cancelled',
    })
    if (notifError) throw notifError

    // Fire-and-forget emails
    const clientData = appointment.clients as unknown as { name: string; email: string | null } | null
    const serviceName = (appointment.services as unknown as { name: string } | null)?.name ?? 'Service'
    if (clientData?.email) {
      const emailContent = cancellationEmail({
        clientName: clientData.name,
        serviceName,
        date: appointment.date,
      })
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: [clientData.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(err => console.error('Token cancel client email failed:', err))
    }
    if (NOTIFY_EMAILS.length > 0) {
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: NOTIFY_EMAILS,
        subject: `RDV annulé via lien — ${clientData?.name ?? 'Client'}`,
        html: `<p>RDV annulé pour <strong>${serviceName}</strong> le <strong>${appointment.date}</strong>.</p>`,
      }).catch(err => console.error('Token cancel staff email failed:', err))
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/tokens/[token]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
