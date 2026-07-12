export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

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
  try {
    const authResult = await requireClient()
    if (!authResult || !authResult.client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = authResult.client
    const body = await request.json()
    const { service_id, date, start_time, duration_minutes } = body

    if (!service_id || !date || !start_time || !duration_minutes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    
    const appointmentDate = new Date(date + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (appointmentDate < today) {
      return NextResponse.json({ error: 'Invalid date: cannot book in the past' }, { status: 400 })
    }

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

    // Capacity check
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

    // Insert appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: client.id,
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
      console.error('Appointment error:', appointmentError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Insert notification
    await supabase.from('notifications').insert({
      appointment_id: appointment.id,
      type: 'new_booking',
    })

    return NextResponse.json({ appointment_id: appointment.id }, { status: 201 })
  } catch (error) {
    console.error('Client booking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
