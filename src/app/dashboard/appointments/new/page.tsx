'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CalendarDays, ChevronDown } from 'lucide-react'
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
  const [serviceOpen, setServiceOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const serviceRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) setServiceOpen(false)
      if (staffRef.current && !staffRef.current.contains(e.target as Node)) setStaffOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(226, 167, 181,0.5)', fontWeight: 500 }}>
          Agenda
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={22} style={{ color: '#E2A7B5' }} /> Nouveau rendez-vous
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
          <div ref={serviceRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setServiceOpen(o => !o)}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: form.serviceId ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' }}>
                {form.serviceId ? services.find(s => s.id === form.serviceId)?.name ?? 'Choisir un service' : 'Choisir un service'}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '8px', color: 'rgba(255,255,255,0.4)', transform: serviceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {serviceOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#2A191D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 50, maxHeight: '220px', overflowY: 'auto' }}>
                {services.map((s, i) => (
                  <button key={s.id} type="button"
                    onClick={() => { setForm(f => ({...f, serviceId: s.id, durationMinutes: s.min_duration ?? 60})); setServiceOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '14px', background: form.serviceId === s.id ? 'rgba(226, 167, 181,0.1)' : 'none', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', color: form.serviceId === s.id ? '#E2A7B5' : 'rgba(255,255,255,0.85)', borderRadius: i === 0 ? '10px 10px 0 0' : i === services.length - 1 ? '0 0 10px 10px' : '0' }}>
                    {s.name} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>({s.min_duration}–{s.max_duration} min)</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {field('Staff assigné', (
          <div ref={staffRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setStaffOpen(o => !o)}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ color: form.staffId ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' }}>
                {form.staffId ? staff.find(s => s.id === form.staffId)?.name ?? 'À assigner plus tard' : 'À assigner plus tard'}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '8px', color: 'rgba(255,255,255,0.4)', transform: staffOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {staffOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#2A191D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                <button type="button" onClick={() => { setForm(f => ({...f, staffId: ''})); setStaffOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '14px', background: !form.staffId ? 'rgba(226, 167, 181,0.1)' : 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', borderRadius: '10px 10px 0 0' }}>
                  À assigner plus tard
                </button>
                {staff.filter(s => s.role !== 'secretary').map((s, i, arr) => (
                  <button key={s.id} type="button"
                    onClick={() => { setForm(f => ({...f, staffId: s.id})); setStaffOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '14px', background: form.staffId === s.id ? 'rgba(226, 167, 181,0.1)' : 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: form.staffId === s.id ? '#E2A7B5' : 'rgba(255,255,255,0.85)', borderRadius: i === arr.length - 1 ? '0 0 10px 10px' : '0' }}>
                    {s.name} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>({s.role})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            background: loading ? 'rgba(226, 167, 181,0.4)' : 'linear-gradient(135deg, #E2A7B5, #C98FA0)',
            color: '#2B1B1E',
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
