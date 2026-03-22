import type { Service } from '@/lib/supabase/types'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export default function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div>
      <h2 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '20px', marginTop: '32px' }}>Choisissez un service</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            style={{
              textAlign: 'left', padding: '16px', borderRadius: '14px', cursor: 'pointer', width: '100%',
              background: selectedId === service.id ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.05)',
              border: selectedId === service.id ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ marginTop: '3px', width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: service.color ?? '#C9A96E' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: selectedId === service.id ? '#C9A96E' : 'rgba(255,255,255,0.9)', lineHeight: '1.3' }}>{service.name}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{service.min_duration}–{service.max_duration} min</p>
              </div>
              {selectedId === service.id && (
                <svg width="16" height="16" fill="#C9A96E" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
