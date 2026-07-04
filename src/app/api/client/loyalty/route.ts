export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

/**
 * Brazilian Club — loyalty points.
 *
 * Points are DERIVED, never stored: computed from salon-recorded completed
 * appointments and paid factures. There is no client-writable balance, so
 * there is nothing to tamper with. Rules:
 *   +50 points   welcome (account exists)
 *   +50 points   per completed visit
 *   +1 point     per 10 MAD paid (paid factures)
 * Tiers: Rose (0+), Rose Gold (500+), Diamant (1500+)
 */

const TIERS = [
  { key: 'rose', label: 'Rose', min: 0, perk: 'Des points sur chaque visite' },
  { key: 'rose-gold', label: 'Rose Gold', min: 500, perk: '-10% sur une prestation au choix' },
  { key: 'diamant', label: 'Diamant', min: 1500, perk: '-15% et une attention pour votre anniversaire' },
] as const

export async function GET() {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const supabase = createServerSupabaseClient()

    const [{ count: visits }, { data: paid }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('status', 'completed'),
      supabase
        .from('factures')
        .select('paid_amount')
        .eq('client_id', client.id)
        .eq('status', 'paid'),
    ])

    const totalPaid = (paid ?? []).reduce((sum, f) => sum + (f.paid_amount ?? 0), 0)
    const points = 50 + (visits ?? 0) * 50 + Math.floor(totalPaid / 10)

    const tier = [...TIERS].reverse().find(t => points >= t.min) ?? TIERS[0]
    const nextTier = TIERS.find(t => t.min > points) ?? null

    const progress = nextTier
      ? Math.min(1, (points - tier.min) / (nextTier.min - tier.min))
      : 1

    return NextResponse.json({
      points,
      visits: visits ?? 0,
      tier: { key: tier.key, label: tier.label, perk: tier.perk },
      nextTier: nextTier ? { label: nextTier.label, at: nextTier.min, missing: nextTier.min - points } : null,
      progress,
    })
  } catch (err) {
    console.error('GET /api/client/loyalty error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}
