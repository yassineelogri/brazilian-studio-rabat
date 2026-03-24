export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppReminder } from '@/lib/whatsapp'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const now = new Date()

  let sent = 0
  let skipped = 0
  let errors = 0

  // ── Helper: process one time window ──────────────────────────────────────
  // windowStartMinutes and windowEndMinutes are both added to now() — they are
  // positive offsets into the future (e.g. 1410 = 23h30 from now).
  async function processWindow(
    windowStartMinutes: number,
    windowEndMinutes: number,
    reminderType: '24h' | '2h',
    templateName: string
  ) {
    const windowStart = new Date(now.getTime() + windowStartMinutes * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + windowEndMinutes   * 60 * 1000)

    // Fetch confirmed appointments whose starts_at falls in the window
    // Always use starts_at (the stored timestamptz) — never date+start_time separately
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        clients ( name, phone ),
        services ( name )
      `)
      .eq('status', 'confirmed')
      .gte('starts_at', windowStart.toISOString())
      .lte('starts_at', windowEnd.toISOString())

    if (fetchError) {
      console.error(`[reminders] fetch error for ${reminderType}:`, fetchError.message)
      return
    }

    for (const appt of appointments ?? []) {
      // Check for existing reminder (deduplication)
      const { data: existing } = await supabase
        .from('reminders')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('type', reminderType)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Supabase-JS may return joined relations as an array (when Relationships metadata
      // is empty) or as a single object (when FK is inferred). Handle both cases safely.
      const rawClient = appt.clients as unknown as { name: string; phone: string } | { name: string; phone: string }[] | null
      const client = Array.isArray(rawClient) ? (rawClient[0] ?? null) : rawClient
      const rawService = appt.services as unknown as { name: string } | { name: string }[] | null
      const service = Array.isArray(rawService) ? (rawService[0] ?? null) : rawService

      if (!client?.phone) {
        console.warn(`[reminders] appointment ${appt.id} has no client phone — skipping`)
        skipped++
        continue
      }

      // Build template params
      const timeLabel = appt.start_time.slice(0, 5).replace(':', 'h') // "14:30" → "14h30"
      const params: string[] = reminderType === '24h'
        ? [client.name, timeLabel, service?.name ?? '', `${SITE_URL}/espace-client`]
        : [client.name, timeLabel, service?.name ?? '']

      const result = await sendWhatsAppReminder(client.phone, templateName, params)

      if (result.ok) {
        await supabase.from('reminders').insert({
          appointment_id: appt.id,
          type: reminderType,
        })
        sent++
        console.log(`[reminders] sent ${reminderType} reminder for appointment ${appt.id}`)
      } else {
        errors++
        console.error(`[reminders] failed ${reminderType} reminder for appointment ${appt.id}:`, result.error)
        // Do NOT insert — next cron run will retry
      }
    }
  }

  // ── 24h window: starts_at between now+23h30 and now+24h30 ────────────────
  await processWindow(23 * 60 + 30, 24 * 60 + 30, '24h', 'rdv_rappel_24h')

  // ── 2h window: starts_at between now+1h30 and now+2h30 ───────────────────
  await processWindow(1 * 60 + 30, 2 * 60 + 30, '2h', 'rdv_rappel_2h')

  return NextResponse.json({ sent, skipped, errors })
}
