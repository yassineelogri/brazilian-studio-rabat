export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/api-helpers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const staff = await requireStaff()
    if (!staff) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()
    const { data: facture } = await supabase.from('factures').select('id, status, events').eq('id', params.id).single()
    if (!facture) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (facture.status !== 'sent') return NextResponse.json({ error: 'invalid_status' }, { status: 422 })

    const body = await request.json()
    const { payment_method, paid_amount } = body

    if (!payment_method || !['cash', 'card', 'transfer'].includes(payment_method)) {
      return NextResponse.json({ error: 'payment_method must be cash, card, or transfer' }, { status: 422 })
    }
    if (paid_amount === undefined || isNaN(Number(paid_amount)) || Number(paid_amount) < 0) {
      return NextResponse.json({ error: 'paid_amount must be >= 0' }, { status: 422 })
    }

    const newEvents = [...(facture.events as any[]), { at: new Date().toISOString(), by: staff.id, status: 'paid' }]
    const { error } = await supabase.from('factures').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: Number(paid_amount),
      payment_method,
      events: newEvents,
    }).eq('id', params.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/factures/[id]/mark-paid error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
