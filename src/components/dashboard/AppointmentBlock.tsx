import { Link2 } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations
  onClick: (a: AppointmentWithRelations) => void
  style?: React.CSSProperties
  copiedId?: string
  onCopyLink?: (id: string) => void
}

const STATUS_STYLES = {
  pending:   'border-l-4 border-amber-400 bg-amber-50',
  confirmed: 'border-l-4 border-green-400 bg-green-50',
  cancelled: 'border-l-4 border-gray-300 bg-gray-50 opacity-60',
  completed: 'border-l-4 border-blue-300 bg-blue-50',
  no_show:   'border-l-4 border-red-300 bg-red-50',
}

export default function AppointmentBlock({ appointment, onClick, style, copiedId, onCopyLink }: Props) {
  const statusStyle = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.pending

  return (
    <div
      style={{ backgroundColor: appointment.services?.color + '33', borderColor: appointment.services?.color, ...style }}
      className={`w-full text-left p-2 rounded-md border-l-4 text-xs overflow-hidden ${statusStyle}`}
    >
      <button
        type="button"
        onClick={() => onClick(appointment)}
        className="w-full text-left cursor-pointer hover:opacity-90 transition"
      >
        <p className="font-semibold text-salon-dark truncate">{appointment.clients?.name}</p>
        <p className="text-salon-muted truncate">{appointment.services?.name}</p>
        <p className="text-salon-muted">
          {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
        </p>
        {appointment.status === 'pending' && (
          <span className="inline-block mt-1 text-amber-600 font-medium">⏳ En attente</span>
        )}
      </button>
      {onCopyLink && (
        <button
          type="button"
          onClick={() => onCopyLink(appointment.id)}
          title="Copier le lien privé client"
          className="p-1 text-salon-muted hover:text-salon-pink transition"
        >
          {copiedId === appointment.id
            ? <span className="text-xs text-green-600">Copié !</span>
            : <Link2 size={14} />}
        </button>
      )}
    </div>
  )
}
