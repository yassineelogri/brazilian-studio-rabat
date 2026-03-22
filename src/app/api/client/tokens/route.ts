import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!await requireStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { appointment_id } = await request.json()
    if (!appointment_id) {
      return NextResponse.json({ error: 'appointment_id is required' }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch appointment to get client_id
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, client_id')
      .eq('id', appointment_id)
      .single()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 })
    }

    // Upsert token — ON CONFLICT refreshes expiry (must include expires_at in payload)
    const { data, error } = await supabase
      .from('booking_tokens')
      .upsert(
        {
          client_id: appointment.client_id,
          appointment_id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'appointment_id', ignoreDuplicates: false }
      )
      .select('token')
      .single()

    if (error || !data) throw error ?? new Error('Token upsert returned no data')

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      token: data.token,
      url: `${siteUrl}/espace-client/acces/${data.token}`,
    }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/tokens error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
