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
    <div
      style={{
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Day header row */}
      <div className="grid" style={{ gridTemplateColumns: '52px repeat(6, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '16px 0' }} />
        {days.map((day, i) => {
          const dateStr = formatDate(day)
          const isToday = dateStr === todayStr
          const count = appointments.filter(a => a.date === dateStr).length
          return (
            <div
              key={dateStr}
              style={{
                padding: '16px 0',
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.04)',
                background: isToday ? 'rgba(201,169,110,0.06)' : 'transparent',
              }}
            >
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: isToday ? '#C9A96E' : 'rgba(255,255,255,0.35)',
              }}>
                {DAY_LABELS[i]}
              </p>
              <div style={{ position: 'relative', display: 'inline-block', marginTop: '4px' }}>
                {isToday && (
                  <div style={{
                    position: 'absolute',
                    inset: '-4px -8px',
                    borderRadius: '12px',
                    background: 'rgba(201,169,110,0.15)',
                    border: '1px solid rgba(201,169,110,0.2)',
                  }} />
                )}
                <p style={{
                  position: 'relative',
                  fontSize: '22px',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: isToday ? '#C9A96E' : 'rgba(255,255,255,0.8)',
                }}>
                  {day.getDate()}
                </p>
              </div>
              {count > 0 && (
                <div style={{
                  margin: '8px auto 0',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isToday ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.06)',
                  color: isToday ? '#C9A96E' : 'rgba(255,255,255,0.5)',
                  border: isToday ? '1px solid rgba(201,169,110,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  {count}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {HOURS.map((hour, hi) => (
          <motion.div
            key={hour}
            custom={hi}
            variants={rowVariants}
            initial="hidden"
            animate="show"
            className="grid"
            style={{
              gridTemplateColumns: '52px repeat(6, 1fr)',
              minHeight: '80px',
              borderBottom: hi < HOURS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
            }}
          >
            {/* Time label */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              paddingRight: '12px',
              paddingTop: '10px',
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.2)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {hour}h
              </span>
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
                  style={{
                    borderLeft: '1px solid rgba(255,255,255,0.04)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: isToday ? 'rgba(201,169,110,0.02)' : 'transparent',
                    overflow: 'hidden',
                    minWidth: 0,
                  }}
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
