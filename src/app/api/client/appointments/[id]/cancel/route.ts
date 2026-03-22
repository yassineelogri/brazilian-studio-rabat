export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()

    // Fetch appointment and verify ownership
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, client_id, status, starts_at, date, start_time, services:service_id(name)')
      .eq('id', params.id)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (appointment.client_id !== client.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Idempotent: already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Status guard
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    // 24h guard — starts_at is a UTC timestamptz
    const startsAt = new Date(appointment.starts_at as string).getTime()
    if (startsAt - Date.now() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'too_late_to_cancel' }, { status: 422 })
    }

    // Update status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', params.id)

    if (updateError) throw updateError

    // Insert notification
    const { error: notifError } = await supabase.from('notifications').insert({
      appointment_id: params.id,
      type: 'cancelled',
    })
    if (notifError) throw notifError

    // Fire-and-forget emails
    const serviceName = (appointment.services as unknown as { name: string } | null)?.name ?? 'Service'
    if (client.email) {
      const emailContent = cancellationEmail({
        clientName: client.name,
        serviceName,
        date: appointment.date,
      })
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: [client.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(err => console.error('Client cancellation email failed:', err))
    }
    if (NOTIFY_EMAILS.length > 0) {
      resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: NOTIFY_EMAILS,
        subject: `RDV annulé par le client — ${client.name}`,
        html: `<p>Le client <strong>${client.name}</strong> a annulé son RDV pour <strong>${serviceName}</strong> le <strong>${appointment.date}</strong> à <strong>${appointment.start_time}</strong>.</p>`,
      }).catch(err => console.error('Staff cancellation notification failed:', err))
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/appointments/[id]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
