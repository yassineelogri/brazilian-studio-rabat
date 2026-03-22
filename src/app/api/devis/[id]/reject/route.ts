export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: devis, error: fetchErr } = await supabase
      .from('devis').select('id, status, events').eq('id', params.id).single()
    if (fetchErr || !devis) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (devis.status !== 'sent') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })

    const newEvents = [...(devis.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'rejected' }]
    const { error } = await supabase.from('devis').update({ status: 'rejected', events: newEvents }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/devis/[id]/reject error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
