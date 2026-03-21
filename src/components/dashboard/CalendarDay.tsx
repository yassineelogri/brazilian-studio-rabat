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

  return (
    <div className="flex">
      {/* Time labels */}
      <div className="w-14 flex-shrink-0">
        {hours.map(h => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start pt-1">
            <span className="text-xs text-gray-400">{h}:00</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 relative border-l border-gray-100">
        {/* Hour lines */}
        {hours.map(h => (
          <div
            key={h}
            style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            className="absolute left-0 right-0 border-t border-gray-100"
          />
        ))}

        {/* Appointment blocks */}
        {dayAppts.map(appt => (
          <div
            key={appt.id}
            style={{
              position: 'absolute',
              top: getTopOffset(appt.start_time),
              height: Math.max(getHeight(appt.start_time, appt.end_time) - 4, 28),
              left: 4,
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
