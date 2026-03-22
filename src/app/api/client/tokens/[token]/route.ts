import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: tokenRow, error } = await supabase
      .from('booking_tokens')
      .select('appointment_id, expires_at')
      .eq('token', params.token)
      .single()

    if (error || !tokenRow) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'token_expired' }, { status: 410 })
    }

    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id, date, start_time, end_time, status, notes, starts_at,
        clients:client_id(name),
        services:service_id(name, color),
        staff:staff_id(name)
      `)
      .eq('id', tokenRow.appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json(appointment, { status: 200 })
  } catch (err) {
    console.error('GET /api/client/tokens/[token] error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
