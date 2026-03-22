'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CalendarDays } from 'lucide-react'
import type { Service, Staff } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.9)',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '6px',
}

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
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: '520px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.5)', fontWeight: 500 }}>
          Agenda
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={22} style={{ color: '#C9A96E' }} /> Nouveau rendez-vous
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {field('Nom du client *', <input style={inputStyle} required value={form.clientName} onChange={e => setForm(f => ({...f, clientName: e.target.value}))} />)}
        {field('Téléphone *', <input style={inputStyle} required type="tel" value={form.clientPhone} onChange={e => setForm(f => ({...f, clientPhone: e.target.value}))} />)}

        {field('Service *', (
          <select style={inputStyle} required value={form.serviceId} onChange={e => {
            const s = services.find(s => s.id === e.target.value)
            setForm(f => ({...f, serviceId: e.target.value, durationMinutes: s?.min_duration ?? 60}))
          }}>
            <option value="">Choisir un service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.min_duration}–{s.max_duration} min)</option>)}
          </select>
        ))}

        {field('Staff assigné', (
          <select style={inputStyle} value={form.staffId} onChange={e => setForm(f => ({...f, staffId: e.target.value}))}>
            <option value="">À assigner plus tard</option>
            {staff.filter(s => s.role !== 'secretary').map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
          </select>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {field('Date *', <input style={inputStyle} required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />)}
          {field('Heure *', <input style={inputStyle} required type="time" min="10:00" max="20:00" step="1800" value={form.startTime} onChange={e => setForm(f => ({...f, startTime: e.target.value}))} />)}
        </div>

        {field('Durée (minutes)', <input style={inputStyle} required type="number" min="15" max="300" value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: Number(e.target.value)}))} />)}
        {field('Notes internes', <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />)}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? 'rgba(201,169,110,0.4)' : 'linear-gradient(135deg, #C9A96E, #B8944F)',
            color: '#1A1410',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '4px',
          }}
        >
          {loading ? 'Enregistrement...' : 'Créer le rendez-vous'}
        </button>
      </form>
    </div>
  )
}
