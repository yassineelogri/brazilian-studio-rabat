'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Scissors } from 'lucide-react'
import type { Service } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('services').select('*').order('name').then(({ data }) => setServices(data ?? []))
  }, [])

  async function updateService(id: string, updates: Partial<Service>) {
    await supabase.from('services').update(updates).eq('id', id)
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    setEditing(null)
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B26478', fontWeight: 500 }}>
          Gestion
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: '#382227', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scissors size={22} style={{ color: '#8E4457' }} /> Prestations
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {services.map(service => (
          <div
            key={service.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid #FFFFFF',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            {editing === service.id ? (
              <EditServiceForm service={service} onSave={updates => updateService(service.id, updates)} onCancel={() => setEditing(null)} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: service.color, flexShrink: 0, boxShadow: `0 0 8px ${service.color}60` }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#382227' }}>{service.name}</p>
                    <p style={{ fontSize: '12px', color: '#9A8288', marginTop: '2px' }}>{service.min_duration}–{service.max_duration} min</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditing(service.id)}
                  style={{ fontSize: '12px', color: '#8E4457', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Modifier
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditServiceForm({ service, onSave, onCancel }: {
  service: Service
  onSave: (updates: Partial<Service>) => void
  onCancel: () => void
}) {
  const [min, setMin] = useState(service.min_duration)
  const [max, setMax] = useState(service.max_duration)
  const [color, setColor] = useState(service.color)

  const labelStyle = { fontSize: '11px', color: '#8A6E74', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }
  const inputStyle = { background: '#FFFFFF', border: '1px solid #EEDCD7', borderRadius: '10px', color: '#382227', padding: '8px 12px', fontSize: '13px', width: '100%', outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#382227' }}>{service.name}</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Durée min (min)</label>
          <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Durée max (min)</label>
          <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Couleur</label>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ height: '38px', width: '48px', borderRadius: '10px', cursor: 'pointer', border: '1px solid #EEDCD7', background: '#FFFFFF', padding: '2px' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onSave({ min_duration: min, max_duration: max, color })}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #A85D70, #7E4452)', color: '#FFFFFF', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Sauvegarder
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '8px 16px', background: '#FFFFFF', border: '1px solid #EEDCD7', color: '#7E6469', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
