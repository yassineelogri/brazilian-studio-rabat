import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resend, NOTIFY_EMAILS } from '@/lib/resend'
import { newBookingEmail, bookingConfirmationEmail } from '@/lib/email-templates'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}:00`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { client, service_id, date, start_time, duration_minutes } = body

  // 1. Validate required fields
  if (!client?.name || !client?.phone || !service_id || !date || !start_time || !duration_minutes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 2. Validate date is not Sunday and not in the past
  const appointmentDate = new Date(date + 'T00:00:00')
  if (appointmentDate.getDay() === 0) {
    return NextResponse.json({ error: 'Invalid date: salon is closed on Sundays' }, { status: 400 })
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (appointmentDate < today) {
    return NextResponse.json({ error: 'Invalid date: cannot book in the past' }, { status: 400 })
  }

  // 3. Compute end_time and validate ≤ 20:00
  const startMinutes = timeToMinutes(start_time)
  const endMinutes = startMinutes + Number(duration_minutes)
  if (endMinutes > 20 * 60) {
    return NextResponse.json({ error: 'Invalid date: appointment would end after 20:00' }, { status: 400 })
  }
  const end_time = minutesToTime(endMinutes)
  const startTimeFull = start_time.includes(':') && start_time.split(':').length === 2
    ? `${start_time}:00`
    : start_time

  const supabase = createServerSupabaseClient()

  // 4. Capacity check
  const { data: overlapping, error: overlapError } = await supabase
    .from('appointments')
    .select('id')
    .eq('date', date)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', end_time)
    .gt('end_time', startTimeFull)

  if (overlapError) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if ((overlapping?.length ?? 0) >= 2) {
    return NextResponse.json({ error: 'No availability at this time' }, { status: 409 })
  }

  // 5. Upsert client by phone (never overwrite existing name)
  let clientId: string
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', client.phone)
    .single()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ name: client.name, phone: client.phone, email: client.email ?? null })
      .select('id')
      .single()
    if (clientError || !newClient) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    clientId = newClient.id
  }

  // 6. Insert appointment
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      service_id,
      date,
      start_time: startTimeFull,
      end_time,
      duration_minutes: Number(duration_minutes),
      status: 'pending',
      created_by: 'client',
    })
    .select('id')
    .single()

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 7. Insert notification
  await supabase.from('notifications').insert({
    appointment_id: appointment.id,
    type: 'new_booking',
  })

  // 9. Generate booking token (for client portal private link)
  let bookingToken: string | null = null
  const { data: tokenRow } = await supabase
    .from('booking_tokens')
    .insert({
      client_id: clientId,
      appointment_id: appointment.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('token')
    .single()
  if (tokenRow) bookingToken = tokenRow.token

  // Fetch service once — reused by both the confirmation email and staff notification email below
  const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', service_id)
    .single()

  // 10. Send confirmation email to client (non-blocking)
  // staff is not fetched in this route, so staffName is null
  if (bookingToken && client?.email) {
    const emailContent = bookingConfirmationEmail({
      clientName: client.name,
      serviceName: service?.name ?? 'Service',
      date,
      startTime: start_time,
      staffName: null,
      token: bookingToken,
    })
    resend.emails.send({
      from: 'Brazilian Studio <onboarding@resend.dev>',
      to: [client.email],
      subject: emailContent.subject,
      html: emailContent.html,
    }).catch(err => console.error('Booking confirmation email failed:', err))
  }

  // 8. Send email to staff (non-fatal)
  try {
    const template = newBookingEmail({
      clientName: client.name,
      clientPhone: client.phone,
      serviceName: service?.name ?? 'Service',
      date,
      startTime: start_time,
      appointmentId: appointment.id,
    })

    if (NOTIFY_EMAILS.length > 0) {
      await resend.emails.send({
        from: 'Brazilian Studio <onboarding@resend.dev>',
        to: NOTIFY_EMAILS,
        subject: template.subject,
        html: template.html,
      })
    }
  } catch {
    console.error('Failed to send notification email')
  }

  return NextResponse.json({ appointment_id: appointment.id }, { status: 201 })
}
