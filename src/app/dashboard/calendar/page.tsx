'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import CalendarDay from '@/components/dashboard/CalendarDay'
import CalendarWeek from '@/components/dashboard/CalendarWeek'
import AppointmentSlideOver from '@/components/dashboard/AppointmentSlideOver'

type View = 'day' | 'week'

function getMondayOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const weekStart = getMondayOfWeek(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 5)
  const rangeStart = view === 'day' ? formatDate(currentDate) : formatDate(weekStart)
  const rangeEnd   = view === 'day' ? formatDate(currentDate) : formatDate(weekEnd)

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        clients(name, phone, email),
        services(name, color),
        staff(name)
      `)
      .gte('date', rangeStart)
      .lte('date', rangeEnd)
      .order('start_time')

    setAppointments((data as unknown as AppointmentWithRelations[]) ?? [])
    setLoading(false)
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    fetchAppointments()

    // Real-time subscription
    const channel = supabase
      .channel('calendar-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchAppointments])

  function navigate(direction: 1 | -1) {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + direction)
    else d.setDate(d.getDate() + direction * 7)
    setCurrentDate(d)
  }

  const headerLabel = view === 'day'
    ? currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const copyPrivateLink = useCallback(async (appointmentId: string) => {
    try {
      const res = await fetch('/api/client/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      })
      if (!res.ok) {
        console.error('copyPrivateLink: server returned', res.status)
        return
      }
      const { url } = await res.json()
      await navigator.clipboard.writeText(url)
      clearTimeout(copiedTimerRef.current)
      setCopiedId(appointmentId)
      copiedTimerRef.current = setTimeout(() => setCopiedId(undefined), 2000)
    } catch (err) {
      console.error('copyPrivateLink:', err)
    }
  }, [])

  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current)
  }, [])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-salon-dark capitalize">{headerLabel}</h2>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-2 text-xs text-salon-gold underline"
          >
            Aujourd'hui
          </button>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['day', 'week'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === v ? 'bg-white shadow-sm text-salon-dark' : 'text-gray-400'
              }`}
            >
              {v === 'day' ? 'Jour' : 'Semaine'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : view === 'day' ? (
        <CalendarDay
          date={formatDate(currentDate)}
          appointments={appointments}
          onAppointmentClick={setSelected}
          copiedId={copiedId}
          onCopyLink={copyPrivateLink}
        />
      ) : (
        <CalendarWeek
          weekStart={weekStart}
          appointments={appointments}
          onAppointmentClick={setSelected}
          copiedId={copiedId}
          onCopyLink={copyPrivateLink}
        />
      )}

      {/* Slide-over */}
      <AppointmentSlideOver
        appointment={selected}
        onClose={() => setSelected(null)}
        onAction={fetchAppointments}
      />
    </div>
  )
}
