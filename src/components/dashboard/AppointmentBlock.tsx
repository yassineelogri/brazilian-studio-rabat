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

const STATUS_DOT: Record<string, string> = {
  confirmed: '#1C9950',
  pending:   '#B07818',
  cancelled: '#6B7280',
  completed: '#60A5FA',
  no_show:   '#C94F4F',
}

export default function AppointmentBlock({ appointment, onClick, style, copiedId, onCopyLink, showTime }: Props) {
  const serviceName = appointment.services?.name ?? 'RDV'
  const clientName  = appointment.clients?.name ?? ''
  const color       = appointment.services?.color ?? '#8E4457'
  const durationMin = appointment.duration_minutes ?? 60
  const timeStr     = appointment.start_time?.slice(0, 5) ?? ''
  const dotColor    = STATUS_DOT[appointment.status] ?? STATUS_DOT.pending

  return (
    <motion.div
      style={{
        ...style,
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#F7E9E6',
        border: '1px solid #FFFFFF',
      }}
      onClick={() => onClick(appointment)}
      whileHover={{ y: -1, boxShadow: `0 4px 16px rgba(56,34,39,0.08), 0 0 0 1px ${color}30` }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {/* Left accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}40`,
        }}
      />

      <div style={{ paddingLeft: '10px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
        {/* Time + status dot */}
        {showTime && timeStr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                flexShrink: 0,
                backgroundColor: dotColor,
                boxShadow: `0 0 6px ${dotColor}60`,
              }}
            />
            <span style={{ fontSize: '10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>
              {timeStr}
            </span>
            <span style={{ fontSize: '9px', color: '#9A8288', marginLeft: 'auto' }}>
              {Math.floor(durationMin / 60)}h{durationMin % 60 ? String(durationMin % 60).padStart(2, '0') : ''}
            </span>
          </div>
        )}

        {/* Service + client */}
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#432B31', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {serviceName}
        </p>
        <p style={{ fontSize: '10px', color: '#8A6E74', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
          {clientName}
        </p>
      </div>

      {/* Copy link button */}
      {onCopyLink && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onCopyLink(appointment.id) }}
          title="Copier le lien privé client"
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            borderRadius: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#B8A6AA',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F7E9E6'; e.currentTarget.style.color = '#8E4457' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B8A6AA' }}
        >
          {copiedId === appointment.id
            ? <Check size={10} style={{ color: '#1C9950' }} />
            : <Link2 size={10} />}
        </button>
      )}
    </motion.div>
  )
}
