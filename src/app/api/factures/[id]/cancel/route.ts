import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture } = await supabase.from('factures').select('id, status, events').eq('id', params.id).single()
    if (!facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (facture.status === 'paid') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    if (!['draft', 'sent'].includes(facture.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 422 })
    }

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'cancelled' }]
    const { error } = await supabase.from('factures').update({ status: 'cancelled', events: newEvents }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/cancel error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
