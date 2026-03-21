import type { AppointmentStatus } from '@/lib/supabase/types'

export function canCancel(status: AppointmentStatus, startsAt: string): boolean {
  if (status !== 'confirmed' && status !== 'pending') return false
  return new Date(startsAt).getTime() - Date.now() > 24 * 60 * 60 * 1000
}
