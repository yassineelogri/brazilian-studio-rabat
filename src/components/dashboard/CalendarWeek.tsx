'use client'

import { motion } from 'framer-motion'
import { type Variants } from 'framer-motion'
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  weekStart: Date
  appointments: AppointmentWithRelations[]
  onAppointmentClick: (a: AppointmentWithRelations) => void
  copiedId?: string
  onCopyLink?: (id: string) => void
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 10) // 10h → 20h
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const rowVariants: Variants = {
  hidden: { opacity: 0 },
  show: (i: number) => ({ opacity: 1, transition: { delay: i * 0.03, duration: 0.2 } }),
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.18 } }),
}

export default function CalendarWeek({ weekStart, appointments, onAppointmentClick, copiedId, onCopyLink }: Props) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const todayStr = formatDate(new Date())

  return (
    <div className="bg-white rounded-2xl border border-salon-rose/15 overflow-hidden shadow-card">

      {/* ── Day header row ── */}
      <div className="grid border-b border-salon-rose/15" style={{ gridTemplateColumns: '52px repeat(6, 1fr)' }}>
        <div className="py-4" /> {/* time gutter */}
        {days.map((day, i) => {
          const dateStr = formatDate(day)
          const isToday = dateStr === todayStr
          const count = appointments.filter(a => a.date === dateStr).length
          return (
            <div
              key={dateStr}
              className={`py-4 text-center border-l border-salon-rose/10 transition-colors ${
                isToday ? 'bg-gradient-to-b from-salon-dark/[0.04] to-transparent' : ''
              }`}
            >
              <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isToday ? 'text-salon-gold' : 'text-salon-muted'}`}>
                {DAY_LABELS[i]}
              </p>
              <div className="relative inline-block mt-1">
                {isToday && (
                  <div className="absolute inset-0 rounded-full bg-salon-dark scale-110" />
                )}
                <p className={`relative text-2xl font-bold leading-none ${isToday ? 'text-salon-pink' : 'text-salon-dark'}`}>
                  {day.getDate()}
                </p>
              </div>
              {count > 0 && (
                <div className={`mx-auto mt-2 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                  isToday ? 'bg-salon-gold text-white' : 'bg-salon-rose/25 text-salon-gold'
                }`}>
                  {count}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Time grid ── */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {HOURS.map((hour, hi) => (
          <motion.div
            key={hour}
            custom={hi}
            variants={rowVariants}
            initial="hidden"
            animate="show"
            className={`grid ${hi < HOURS.length - 1 ? 'border-b border-salon-rose/8' : ''}`}
            style={{ gridTemplateColumns: '52px repeat(6, 1fr)', minHeight: '80px' }}
          >
            {/* Time label */}
            <div className="flex items-start justify-end pr-3 pt-2.5 flex-shrink-0 border-r border-salon-rose/10">
              <span className="text-xs font-medium text-salon-muted/50 tabular-nums">{hour}h</span>
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const dateStr = formatDate(day)
              const isToday = dateStr === todayStr
              const hourAppts = appointments.filter(a =>
                a.date === dateStr && parseInt(a.start_time.slice(0, 2)) === hour
              )

              return (
                <div
                  key={di}
                  className={`border-l border-salon-rose/10 p-1.5 space-y-1.5 ${
                    isToday ? 'bg-salon-dark/[0.015]' : ''
                  }`}
                >
                  {hourAppts.map((appt, ai) => (
                    <motion.div
                      key={appt.id}
                      custom={di + ai}
                      variants={cardVariants}
                      initial="hidden"
                      animate="show"
                    >
                      <AppointmentBlock
                        appointment={appt}
                        onClick={onAppointmentClick}
                        copiedId={copiedId}
                        onCopyLink={onCopyLink}
                        showTime
                      />
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
