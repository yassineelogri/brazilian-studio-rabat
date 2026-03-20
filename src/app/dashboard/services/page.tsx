'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Service } from '@/lib/supabase/types'

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
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Prestations</h1>
      <div className="space-y-3">
        {services.map(service => (
          <div key={service.id} className="bg-white rounded-xl border border-salon-rose/20 p-4">
            {editing === service.id ? (
              <EditServiceForm service={service} onSave={updates => updateService(service.id, updates)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: service.color }} />
                  <div>
                    <p className="font-medium text-salon-dark">{service.name}</p>
                    <p className="text-xs text-salon-muted">{service.min_duration}–{service.max_duration} min</p>
                  </div>
                </div>
                <button onClick={() => setEditing(service.id)} className="text-xs text-salon-gold underline">
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

  return (
    <div className="space-y-3">
      <p className="font-medium text-salon-dark">{service.name}</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-salon-muted block mb-1">Durée min (min)</label>
          <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-salon-muted block mb-1">Durée max (min)</label>
          <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="text-xs text-salon-muted block mb-1">Couleur</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-12 rounded-lg cursor-pointer border border-gray-200" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ min_duration: min, max_duration: max, color })} className="px-4 py-2 bg-salon-gold text-white rounded-lg text-sm font-medium hover:bg-salon-dark transition">
          Sauvegarder
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-gray-300 transition">
          Annuler
        </button>
      </div>
    </div>
  )
}
