import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'upcoming' | 'past' | null

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('appointments')
      .select(`
        id, date, start_time, end_time, duration_minutes, status, notes, starts_at,
        services:service_id(name, color),
        staff:staff_id(name)
      `)
      .eq('client_id', client.id)
      .order('starts_at', { ascending: false })

    if (filter === 'upcoming') {
      query = query.gt('starts_at', new Date().toISOString())
    } else if (filter === 'past') {
      query = query.lte('starts_at', new Date().toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [], { status: 200 })
  } catch (err) {
    console.error('GET /api/client/appointments error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
