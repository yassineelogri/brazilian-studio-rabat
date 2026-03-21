import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  weekStart: Date // Monday of the week
  appointments: AppointmentWithRelations[]
  onAppointmentClick: (a: AppointmentWithRelations) => void
  copiedId?: string
  onCopyLink?: (id: string) => void
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function CalendarWeek({ weekStart, appointments, onAppointmentClick, copiedId, onCopyLink }: Props) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid grid-cols-6 gap-2">
      {days.map((day, i) => {
        const dateStr = formatDate(day)
        const dayAppts = appointments.filter(a => a.date === dateStr)
        const isToday = dateStr === formatDate(new Date())

        return (
          <div key={dateStr}>
            {/* Day header */}
            <div className={`text-center py-2 rounded-lg mb-2 ${isToday ? 'bg-salon-gold text-white' : 'bg-gray-50'}`}>
              <p className="text-xs font-medium">{DAY_LABELS[i]}</p>
              <p className={`text-lg font-semibold ${isToday ? 'text-white' : 'text-salon-dark'}`}>
                {day.getDate()}
              </p>
            </div>

            {/* Appointments */}
            <div className="space-y-1 min-h-32">
              {dayAppts.length === 0 && (
                <p className="text-xs text-gray-300 text-center pt-4">—</p>
              )}
              {dayAppts.map(appt => (
                <AppointmentBlock key={appt.id} appointment={appt} onClick={onAppointmentClick} copiedId={copiedId} onCopyLink={onCopyLink} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
