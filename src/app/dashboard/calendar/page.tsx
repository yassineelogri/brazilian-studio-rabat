'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const weekStart = getMondayOfWeek(currentDate)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 5)
  const rangeStart = view === 'day' ? formatDate(currentDate) : formatDate(weekStart)
  const rangeEnd   = view === 'day' ? formatDate(currentDate) : formatDate(weekEnd)

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?from=${rangeStart}&to=${rangeEnd}`)
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
      if (!res.ok) return
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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nav arrows */}
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,169,110,0.1)'; e.currentTarget.style.color = '#C9A96E'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => navigate(1)}
            style={{
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,169,110,0.1)'; e.currentTarget.style.color = '#C9A96E'; e.currentTarget.style.borderColor = 'rgba(201,169,110,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <ChevronRight size={15} />
          </button>

          {/* Header label */}
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
                    <h1 style={{ fontFamily: 'serif', fontSize: '20px', color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize', lineHeight: 1.2, fontWeight: 400 }}>
                      {headerLabel}
                    </h1>
                    <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {appointments.length} rendez-vous
                      {pendingCount > 0 && (
                        <span
                          style={{
                            marginLeft: '8px',
                            padding: '1px 8px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: 'rgba(251,191,36,0.12)',
                            color: '#FBBF24',
                            border: '1px solid rgba(251,191,36,0.2)',
                          }}
                        >
                          {pendingCount} en attente
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textTransform: 'capitalize', lineHeight: 1.2 }}>
                      {headerLabel}
                    </h2>
                    <p style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {appointments.length} rendez-vous cette semaine
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Today button */}
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              marginLeft: '4px',
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'rgba(201,169,110,0.08)',
              border: '1px solid rgba(201,169,110,0.2)',
              color: '#C9A96E',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            Aujourd&apos;hui
          </button>
        </div>

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {(['day', 'week'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="relative"
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '8px',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: view === v ? '#C9A96E' : 'rgba(255,255,255,0.4)',
                transition: 'color 0.15s',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {view === v && (
                <motion.span
                  layoutId="view-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    background: 'rgba(201,169,110,0.12)',
                    border: '1px solid rgba(201,169,110,0.2)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span style={{ position: 'relative' }}>{v === 'day' ? 'Jour' : 'Semaine'}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Error */}
      {fetchError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: '13px',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            color: '#F87171',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          {fetchError}
        </motion.p>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div style={{ height: '64px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 80}ms` }} />
              <div style={{ height: '64px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 120}ms` }} />
              <div style={{ height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', animation: 'pulse 2s ease-in-out infinite', animationDelay: `${i * 160}ms` }} />
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
