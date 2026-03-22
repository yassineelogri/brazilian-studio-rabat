'use client'

import { useEffect, useState } from 'react'

interface Props {
  date: string
  durationMinutes: number
  selectedTime: string
  onSelect: (time: string) => void
}

function timeToMinutes(t: string) {
  const parts = t.split(':').map(Number)
  return parts[0] * 60 + (parts[1] ?? 0)
}

function minutesToDisplay(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export default function TimeStep({ date, durationMinutes, selectedTime, onSelect }: Props) {
  const [bookedSlots, setBookedSlots] = useState<{ start_time: string; end_time: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBooked() {
      setLoading(true)
      try {
        const res = await fetch(`/api/appointments/availability?date=${date}`)
        if (!res.ok) { setBookedSlots([]); return }
        const data = await res.json()
        setBookedSlots(Array.isArray(data) ? data : [])
      } catch {
        setBookedSlots([])
      } finally {
        setLoading(false)
      }
    }
    if (date) fetchBooked()
  }, [date])

  const slots: string[] = []
  const lastStart = 20 * 60 - durationMinutes
  for (let m = 10 * 60; m <= lastStart; m += 30) {
    slots.push(minutesToDisplay(m))
  }

  function isAvailable(slotStart: string) {
    const slotStartM = timeToMinutes(slotStart)
    const slotEndM = slotStartM + durationMinutes
    return bookedSlots.filter(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return bStart < slotEndM && bEnd > slotStartM
    }).length < 2
  }

  if (loading) {
    return (
      <div>
        <h2 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '12px', marginTop: '32px' }}>Choisissez un horaire</h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement des disponibilités...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '16px', marginTop: '32px' }}>Choisissez un horaire</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {slots.map(slot => {
          const available = isAvailable(slot)
          const selected = selectedTime === slot
          return (
            <button
              key={slot}
              disabled={!available}
              onClick={() => onSelect(slot)}
              style={{
                padding: '10px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: available ? 'pointer' : 'not-allowed',
                background: selected ? 'linear-gradient(135deg, #C9A96E, #B8944F)' : available ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: selected ? 'none' : available ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.04)',
                color: selected ? '#1A1410' : available ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              }}
            >
              {slot}
            </button>
          )
        })}
      </div>
      {slots.every(s => !isAvailable(s)) && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '16px', textAlign: 'center' }}>
          Aucun créneau disponible ce jour. Veuillez choisir une autre date.
        </p>
      )}
    </div>
  )
}
