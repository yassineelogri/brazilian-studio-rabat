import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  date: string // YYYY-MM-DD
  appointments: AppointmentWithRelations[]
  onAppointmentClick: (a: AppointmentWithRelations) => void
  copiedId?: string
  onCopyLink?: (id: string) => void
}

const HOUR_HEIGHT = 64 // px per hour
const START_HOUR = 10
const END_HOUR = 20

export default function CalendarDay({ date, appointments, onAppointmentClick, copiedId, onCopyLink }: Props) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  function getTopOffset(time: string) {
    const [h, m] = time.split(':').map(Number)
    return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT
  }

  function getHeight(startTime: string, endTime: string) {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const durationH = (eh + em / 60) - (sh + sm / 60)
    return durationH * HOUR_HEIGHT
  }

  const dayAppts = appointments.filter(a => a.date === date)
  const busyHours = new Set(dayAppts.map(a => parseInt(a.start_time.split(':')[0], 10)))

  return (
    <div style={{ display: 'flex' }}>
      {/* Timeline */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Hour rows */}
        {hours.map(h => {
          const hasBusy = busyHours.has(h)
          return (
            <div key={h} style={{ height: HOUR_HEIGHT }}>
              {hasBusy ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '4px', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', width: '32px', textAlign: 'right', flexShrink: 0, fontWeight: 500 }}>{h}h</span>
                  <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', width: '32px', textAlign: 'right', flexShrink: 0, fontWeight: 500 }}>{h}h</span>
                  <div style={{ flex: 1, borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Appointment blocks */}
        {dayAppts.map(appt => (
          <div
            key={appt.id}
            style={{
              position: 'absolute',
              top: getTopOffset(appt.start_time),
              height: Math.max(getHeight(appt.start_time, appt.end_time) - 4, 28),
              left: 44,
              right: 4,
            }}
          >
            <AppointmentBlock appointment={appt} onClick={onAppointmentClick} copiedId={copiedId} onCopyLink={onCopyLink} />
          </div>
        ))}
      </div>
    </div>
  )
}
