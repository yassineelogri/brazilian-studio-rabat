'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import CalendarDay from '@/components/dashboard/CalendarDay'
import CalendarWeek from '@/components/dashboard/CalendarWeek'
import AppointmentSlideOver from '@/components/dashboard/AppointmentSlideOver'

export const dynamic = 'force-dynamic'

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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const weekStart = getMondayOfWeek(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 5)
  const rangeStart = view === 'day' ? formatDate(currentDate) : formatDate(weekStart)
  const rangeEnd   = view === 'day' ? formatDate(currentDate) : formatDate(weekEnd)

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/appointments?from=${rangeStart}&to=${rangeEnd}`
      )
      if (!res.ok) {
        setFetchError('Impossible de charger les rendez-vous.')
        setAppointments([])
        return
      }
      const data = await res.json()
      setFetchError(null)
      setAppointments(Array.isArray(data) ? data : [])
    } catch {
      setFetchError('Erreur réseau.')
      setAppointments([])
    } finally {
      setLoading(false)
    }
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

  const pendingCount = appointments.filter((a: AppointmentWithRelations) => a.status === 'pending').length

  return (
    <div>
      {/* Toolbar */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-salon-rose/20 text-salon-muted hover:border-salon-gold hover:text-salon-gold transition-colors duration-150"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-salon-rose/20 text-salon-muted hover:border-salon-gold hover:text-salon-gold transition-colors duration-150"
          >
            <ChevronRight size={15} />
          </button>

          <div className="ml-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={headerLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {view === 'day' ? (
                  <>
                    <h1 className="font-serif text-xl text-salon-dark capitalize leading-tight">{headerLabel}</h1>
                    <p className="text-[10px] text-salon-muted tracking-widest uppercase mt-0.5">
                      {appointments.length} rendez-vous
                      {pendingCount > 0 && (
                        <span className="ml-1.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                          {pendingCount} en attente
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-salon-dark capitalize leading-tight">{headerLabel}</h2>
                    <p className="text-[10px] text-salon-muted tracking-widest uppercase mt-0.5">
                      {appointments.length} rendez-vous cette semaine
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="ml-1 text-[11px] text-salon-gold border border-salon-gold/30 hover:bg-salon-pink/30 px-2.5 py-1 rounded-lg transition-colors duration-150"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-salon-rose/10 p-1 rounded-xl">
          {(['day', 'week'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 ${
                view === v ? 'text-white' : 'text-salon-muted hover:text-salon-dark'
              }`}
            >
              {view === v && (
                <motion.span
                  layoutId="view-pill"
                  className="absolute inset-0 bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom rounded-lg"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">{v === 'day' ? 'Jour' : 'Semaine'}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {fetchError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl mb-4"
        >
          {fetchError}
        </motion.p>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-16 bg-salon-rose/10 rounded-xl animate-pulse" />
              <div className="h-16 bg-salon-rose/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="h-12 bg-salon-rose/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
            </div>
          ))}
        </div>
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
