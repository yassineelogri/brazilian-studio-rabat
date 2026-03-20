'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Service, Staff } from '@/lib/supabase/types'

export default function NewAppointmentPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    clientName: '', clientPhone: '',
    serviceId: '', staffId: '',
    date: '', startTime: '',
    durationMinutes: 60, notes: '',
  })

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true).then(({ data }) => setServices(data ?? []))
    supabase.from('staff').select('*').eq('is_active', true).then(({ data }) => setStaff(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { name: form.clientName, phone: form.clientPhone },
        service_id: form.serviceId,
        date: form.date,
        start_time: form.startTime,
        duration_minutes: form.durationMinutes,
      }),
    })

    if (res.ok) {
      const { appointment_id } = await res.json()
      // Assign staff and notes, then auto-confirm
      const patchBody: Record<string, unknown> = {}
      if (form.staffId) patchBody.staff_id = form.staffId
      if (form.notes)   patchBody.notes = form.notes
      if (Object.keys(patchBody).length > 0) {
        await fetch(`/api/appointments/${appointment_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
      }
      await fetch(`/api/appointments/${appointment_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      router.push('/dashboard/calendar')
    } else {
      const { error } = await res.json()
      alert(error)
    }
    setLoading(false)
  }

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-salon-dark mb-1">{label}</label>
      {children}
    </div>
  )

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-salon-gold/40 text-sm"

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Nouveau rendez-vous</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-salon-rose/20 p-6 space-y-4">
        {field('Nom du client *', <input className={inputClass} required value={form.clientName} onChange={e => setForm(f => ({...f, clientName: e.target.value}))} />)}
        {field('Téléphone *', <input className={inputClass} required type="tel" value={form.clientPhone} onChange={e => setForm(f => ({...f, clientPhone: e.target.value}))} />)}

        {field('Service *', (
          <select className={inputClass} required value={form.serviceId} onChange={e => {
            const s = services.find(s => s.id === e.target.value)
            setForm(f => ({...f, serviceId: e.target.value, durationMinutes: s?.min_duration ?? 60}))
          }}>
            <option value="">Choisir un service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.min_duration}–{s.max_duration} min)</option>)}
          </select>
        ))}

        {field('Staff assigné', (
          <select className={inputClass} value={form.staffId} onChange={e => setForm(f => ({...f, staffId: e.target.value}))}>
            <option value="">À assigner plus tard</option>
            {staff.filter(s => s.role !== 'secretary').map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        ))}

        {field('Date *', <input className={inputClass} required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />)}
        {field('Heure *', <input className={inputClass} required type="time" min="10:00" max="20:00" step="1800" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} />)}
        {field('Durée (minutes)', <input className={inputClass} required type="number" min="15" max="300" value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: Number(e.target.value)}))} />)}
        {field('Notes internes', <textarea className={inputClass} rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />)}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-salon-gold text-white rounded-lg font-medium hover:bg-salon-dark transition disabled:opacity-60"
        >
          {loading ? 'Enregistrement...' : 'Créer le rendez-vous'}
        </button>
      </form>
    </div>
  )
}
