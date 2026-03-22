import { motion } from 'framer-motion'
import { Link2, Check } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations
  onClick: (a: AppointmentWithRelations) => void
  style?: React.CSSProperties
  copiedId?: string
  onCopyLink?: (id: string) => void
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400', label: 'Confirmé'  },
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400', label: 'En attente'},
  cancelled: { bg: 'bg-gray-100',  text: 'text-gray-400',   dot: 'bg-gray-300',  label: 'Annulé'    },
  completed: { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400',  label: 'Terminé'   },
  no_show:   { bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400',   label: 'Absent'    },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-300', label: status }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export default function AppointmentBlock({ appointment, onClick, style, copiedId, onCopyLink }: Props) {
  const serviceName = appointment.services?.name ?? 'RDV'
  const clientName  = appointment.clients?.name ?? ''
  const color       = appointment.services?.color ?? '#B76E79'
  const durationMin = appointment.duration_minutes ?? 60
  const duration    = `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2, '0') : ''}`

  return (
    <motion.div
      style={style}
      className="relative bg-white rounded-xl border border-salon-rose/20 overflow-hidden cursor-pointer"
      onClick={() => onClick(appointment)}
      whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(107,58,63,0.12)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3 pr-2.5 py-2.5">
        <div className="flex justify-between items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-salon-dark truncate leading-tight">{serviceName}</p>
            <p className="text-[10px] text-salon-muted mt-0.5 truncate">{clientName}</p>
          </div>
          <p className="text-[10px] font-bold text-salon-gold flex-shrink-0 mt-0.5">{duration}</p>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <StatusBadge status={appointment.status} />
          {onCopyLink && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onCopyLink(appointment.id) }}
              title="Copier le lien privé client"
              className="flex items-center justify-center w-5 h-5 rounded-md hover:bg-salon-pink/30 text-salon-muted hover:text-salon-gold transition-colors"
            >
              {copiedId === appointment.id
                ? <Check size={11} className="text-green-500" />
                : <Link2 size={11} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
