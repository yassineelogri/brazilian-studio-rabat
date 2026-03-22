import { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: LucideIcon
  iconColor?: string
}

export default function StatCard({ label, value, sub, icon: Icon }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '24px',
        background: 'rgba(255,255,255,0.09)',
        border: '1px solid rgba(255,255,255,0.13)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gold corner glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row: accent bar + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
        <div
          style={{
            height: '3px',
            width: '28px',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #C9A96E, rgba(201,169,110,0.3))',
          }}
        />
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(201,169,110,0.1)',
              border: '1px solid rgba(201,169,110,0.15)',
              color: '#C9A96E',
            }}
          >
            <Icon size={16} />
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ position: 'relative' }}>
        <p
          style={{
            fontFamily: 'serif',
            fontSize: '32px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.95)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontWeight: 500,
            color: 'rgba(201,169,110,0.85)',
            marginTop: '8px',
          }}
        >
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
