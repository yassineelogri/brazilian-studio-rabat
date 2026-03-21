import { Link2 } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations
  onClick: (a: AppointmentWithRelations) => void
  style?: React.CSSProperties
  copiedId?: string
  onCopyLink?: (id: string) => void
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Confirmé'  },
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'En attente'},
  cancelled: { bg: 'bg-gray-100',  text: 'text-gray-500',   label: 'Annulé'    },
  completed: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Terminé'   },
  no_show:   { bg: 'bg-red-50',    text: 'text-red-600',    label: 'Absent'    },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: status }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

export default function AppointmentBlock({ appointment, onClick, style, copiedId, onCopyLink }: Props) {
  const serviceName = appointment.services?.name ?? 'RDV'
  const clientName  = appointment.clients?.name ?? ''
  const staffName   = appointment.staff?.name ?? ''
  const color       = appointment.services?.color ?? '#B76E79'
  const durationMin = appointment.duration_minutes ?? 60
  const duration    = `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2, '0') : '00'}`

  return (
    <div
      style={style}
      className="relative bg-white rounded-2xl shadow-card border border-salon-rose/25
                 overflow-hidden hover:shadow-card-hover transition-shadow duration-150 cursor-pointer"
      onClick={() => onClick(appointment)}>
      {/* Gradient accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}88)` }}
      />
      <div className="pl-4 pr-3 py-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="heading-serif text-sm truncate">{serviceName}</p>
            <p className="text-xs text-salon-muted mt-0.5 truncate">{clientName}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-salon-gold">{duration}</p>
            <p className="text-xs text-salon-muted mt-0.5">{staffName}</p>
          </div>
        </div>
        <div className="mt-2">
          <StatusBadge status={appointment.status} />
        </div>
      </div>
      {onCopyLink && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCopyLink(appointment.id) }}
          title="Copier le lien privé client"
          className="absolute top-2 right-2 p-1 text-salon-muted hover:text-salon-pink transition"
        >
          {copiedId === appointment.id
            ? <span className="text-xs text-green-600">Copié !</span>
            : <Link2 size={14} />}
        </button>
      )}
    </div>
  )
}
