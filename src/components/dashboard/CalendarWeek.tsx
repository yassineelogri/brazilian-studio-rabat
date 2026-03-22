import { motion, type Variants } from 'framer-motion'
import type { AppointmentWithRelations } from '@/lib/supabase/types'
import AppointmentBlock from './AppointmentBlock'

interface Props {
  weekStart: Date
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

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const columnVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
}

export default function CalendarWeek({ weekStart, appointments, onAppointmentClick, copiedId, onCopyLink }: Props) {
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const todayStr = formatDate(new Date())

  return (
    <motion.div
      className="grid grid-cols-6 gap-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {days.map((day, i) => {
        const dateStr = formatDate(day)
        const dayAppts = appointments.filter(a => a.date === dateStr)
        const isToday = dateStr === todayStr

        return (
          <motion.div key={dateStr} variants={columnVariants}>
            {/* Day header */}
            <div className={`relative text-center py-2.5 px-1 rounded-xl mb-2 overflow-hidden ${
              isToday
                ? 'bg-gradient-to-b from-salon-dark to-salon-sidebar-bottom'
                : 'bg-white border border-salon-rose/15'
            }`}>
              {isToday && (
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #F8D7DA 0%, transparent 70%)' }}
                />
              )}
              <p className={`text-[10px] font-semibold tracking-widest uppercase ${isToday ? 'text-salon-pink/70' : 'text-salon-muted'}`}>
                {DAY_LABELS[i]}
              </p>
              <p className={`text-xl font-semibold mt-0.5 leading-none ${isToday ? 'text-salon-pink' : 'text-salon-dark'}`}>
                {day.getDate()}
              </p>
              {dayAppts.length > 0 && (
                <div className={`mt-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                  isToday ? 'bg-salon-pink/20 text-salon-pink' : 'bg-salon-rose/20 text-salon-gold'
                }`}>
                  {dayAppts.length}
                </div>
              )}
            </div>

            {/* Appointments */}
            <motion.div
              className="space-y-1.5 min-h-32"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {dayAppts.length === 0 ? (
                <div className="flex items-center justify-center pt-6">
                  <div className="w-6 h-px bg-salon-rose/20" />
                </div>
              ) : (
                dayAppts.map(appt => (
                  <motion.div key={appt.id} variants={cardVariants}>
                    <AppointmentBlock
                      appointment={appt}
                      onClick={onAppointmentClick}
                      copiedId={copiedId}
                      onCopyLink={onCopyLink}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
