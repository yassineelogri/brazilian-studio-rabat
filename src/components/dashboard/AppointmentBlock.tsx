import { motion } from 'framer-motion'
import { Link2, Check } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations
  onClick: (a: AppointmentWithRelations) => void
  style?: React.CSSProperties
  copiedId?: string
  onCopyLink?: (id: string) => void
  showTime?: boolean
}

const STATUS_CONFIG: Record<string, { dot: string; border: string; bg: string }> = {
  confirmed: { dot: 'bg-green-400', border: 'border-green-200', bg: 'bg-green-50/60' },
  pending:   { dot: 'bg-amber-400', border: 'border-amber-200', bg: 'bg-amber-50/60' },
  cancelled: { dot: 'bg-gray-300',  border: 'border-gray-200',  bg: 'bg-gray-50/60'  },
  completed: { dot: 'bg-blue-400',  border: 'border-blue-200',  bg: 'bg-blue-50/40'  },
  no_show:   { dot: 'bg-red-400',   border: 'border-red-200',   bg: 'bg-red-50/40'   },
}

export default function AppointmentBlock({ appointment, onClick, style, copiedId, onCopyLink, showTime }: Props) {
  const serviceName = appointment.services?.name ?? 'RDV'
  const clientName  = appointment.clients?.name ?? ''
  const color       = appointment.services?.color ?? '#B76E79'
  const durationMin = appointment.duration_minutes ?? 60
  const timeStr     = appointment.start_time?.slice(0, 5) ?? ''
  const cfg         = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending

  return (
    <motion.div
      style={style}
      className={`relative rounded-lg border overflow-hidden cursor-pointer ${cfg.border} ${cfg.bg}`}
      onClick={() => onClick(appointment)}
      whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(107,58,63,0.10)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: color }} />

      <div className="pl-2.5 pr-2 py-2">
        {/* Time + status dot */}
        {showTime && timeStr && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
              {timeStr}
            </span>
            <span className="text-[9px] text-salon-muted/60 ml-auto">
              {Math.floor(durationMin / 60)}h{durationMin % 60 ? String(durationMin % 60).padStart(2, '0') : ''}
            </span>
          </div>
        )}

        {/* Service + client */}
        <p className="text-[11px] font-semibold text-salon-dark leading-tight truncate">{serviceName}</p>
        <p className="text-[10px] text-salon-muted truncate mt-0.5">{clientName}</p>
      </div>

      {/* Copy link button */}
      {onCopyLink && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCopyLink(appointment.id) }}
          title="Copier le lien privé client"
          className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 rounded hover:bg-salon-pink/30 text-salon-muted/40 hover:text-salon-gold transition-colors"
        >
          {copiedId === appointment.id
            ? <Check size={10} className="text-green-500" />
            : <Link2 size={10} />}
        </button>
      )}
    </motion.div>
  )
}
