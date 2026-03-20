import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppointmentWithRelations, AppointmentStatus } from '@/lib/supabase/types'
import { resend } from '@/lib/resend'
import { cancellationEmail } from '@/lib/email-templates'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  cancelled: [],
  completed: [],
  no_show:   [],
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { status: newStatus } = await request.json()

  const { data: apptRaw } = await supabase
    .from('appointments')
    .select('*, clients(name, email), services(name)')
    .eq('id', params.id)
    .single()
  const appt = apptRaw as AppointmentWithRelations | null

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ALLOWED_TRANSITIONS[appt.status] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${appt.status} to ${newStatus}` },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: newStatus as AppointmentStatus })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  const client = appt.clients as { name: string; email: string | null }
  if (newStatus === 'cancelled' && client?.email) {
    try {
      const template = cancellationEmail({
        clientName: client.name,
        serviceName: (appt.services as { name: string })?.name ?? '',
        date: appt.date,
      })
      await resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: client.email,
        subject: template.subject,
        html: template.html,
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ appointment: data })
}
