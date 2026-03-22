import { createSessionSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Verify the caller is an authenticated, active staff member.
 * Returns { id } or null.
 * Uses cookie-aware session client so the JWT is read from browser cookies.
 */
export async function requireStaff(): Promise<{ id: string } | null> {
  const session = await createSessionSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()
  return data ?? null
}

/**
 * Verify the caller is an authenticated client.
 * Returns { id, name, phone, email } or null.
 * Client portal API routes import from here.
 */
export async function requireClient(): Promise<{
  id: string
  name: string
  phone: string
  email: string | null
} | null> {
  const session = await createSessionSupabaseClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  const { data } = await supabase
    .from('clients')
    .select('id, name, phone, email')
    .eq('auth_user_id', user.id)
    .single()
  return data ?? null
}

/**
 * Compute HT/TVA/TTC totals from line items.
 * Always called server-side — never trust frontend totals.
 */
export function computeTotals(
  items: Array<{ quantity: number | string; unit_price: number | string }>,
  tva_rate: number | string
): { subtotal_ht: number; tva_amount: number; total_ttc: number } {
  const subtotal_ht = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  )
  const tva_amount = subtotal_ht * Number(tva_rate) / 100
  const total_ttc = subtotal_ht + tva_amount
  return {
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    tva_amount:  Math.round(tva_amount  * 100) / 100,
    total_ttc:   Math.round(total_ttc   * 100) / 100,
  }
}

/**
 * Apply the expired projection: if status is 'sent' and valid_until < today,
 * return 'expired' — but never store it in the DB.
 */
export function projectDevisStatus(
  status: string,
  valid_until: string | null
): string {
  if (status === 'sent' && valid_until) {
    const today = new Date().toISOString().slice(0, 10)
    if (valid_until < today) return 'expired'
  }
  return status
}
