export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppointmentWithRelations, AppointmentStatus } from '@/lib/supabase/types'
import { resend } from '@/lib/resend'
import { confirmationEmail } from '@/lib/email-templates'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const { data: apptRaw } = await supabase
    .from('appointments')
    .select('*, clients(name, email), services(name)')
    .eq('id', params.id)
    .single()
  const appt = apptRaw as AppointmentWithRelations | null

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appt.status !== 'pending') return NextResponse.json({ error: 'Appointment is not pending' }, { status: 422 })

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' as AppointmentStatus })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  await supabase.from('notifications').update({ read: true }).eq('appointment_id', params.id)

  const client = appt.clients as { name: string; email: string | null }
  if (client?.email) {
    try {
      const template = confirmationEmail({
        clientName: client.name,
        serviceName: (appt.services as { name: string })?.name ?? '',
        date: appt.date,
        startTime: appt.start_time.slice(0, 5),
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
