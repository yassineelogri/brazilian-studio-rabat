import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { id } = params
  const body = await request.json()
  const { staff_id, date, start_time, duration_minutes, notes } = body

  const { data: existing } = await supabase.from('appointments').select('*').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (staff_id !== undefined) updates.staff_id = staff_id
  if (notes !== undefined) updates.notes = notes

  if (date || start_time || duration_minutes) {
    const newDate = date ?? existing.date
    const rawStart = start_time ?? existing.start_time.slice(0, 5)
    const newDuration = duration_minutes ?? existing.duration_minutes
    const endMinutes = timeToMinutes(rawStart) + Number(newDuration)

    if (endMinutes > 20 * 60) {
      return NextResponse.json({ error: 'Invalid date: appointment would end after 20:00' }, { status: 400 })
    }
    const newEnd = minutesToTime(endMinutes)
    const newStartFull = rawStart.length === 5 ? `${rawStart}:00` : rawStart

    const { data: overlapping } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', newDate)
      .in('status', ['pending', 'confirmed'])
      .neq('id', id)
      .lt('start_time', newEnd)
      .gt('end_time', newStartFull)

    if ((overlapping?.length ?? 0) >= 2) {
      return NextResponse.json({ error: 'No availability at this time' }, { status: 409 })
    }

    updates.date = newDate
    updates.start_time = newStartFull
    updates.end_time = newEnd
    updates.duration_minutes = Number(newDuration)
  }

  const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ appointment: data })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('appointments').select('id').eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await supabase.from('appointments').delete().eq('id', params.id)
  return new NextResponse(null, { status: 204 })
}
