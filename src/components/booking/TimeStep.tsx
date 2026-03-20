'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()
      const { data } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('date', date)
        .in('status', ['pending', 'confirmed'])
      setBookedSlots(data ?? [])
      setLoading(false)
    }
    if (date) fetchBooked()
  }, [date])

  // Generate candidate slots: 10:00 to last slot where slot + duration ≤ 20:00
  const slots: string[] = []
  const lastStart = 20 * 60 - durationMinutes
  for (let m = 10 * 60; m <= lastStart; m += 30) {
    slots.push(minutesToDisplay(m))
  }

  function isAvailable(slotStart: string) {
    const slotStartM = timeToMinutes(slotStart)
    const slotEndM = slotStartM + durationMinutes
    const overlapCount = bookedSlots.filter(b => {
      const bStart = timeToMinutes(b.start_time)
      const bEnd = timeToMinutes(b.end_time)
      return bStart < slotEndM && bEnd > slotStartM
    }).length
    return overlapCount < 2
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez un horaire</h2>
        <p className="text-salon-muted text-sm">Chargement des disponibilités...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez un horaire</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map(slot => {
          const available = isAvailable(slot)
          return (
            <button
              key={slot}
              disabled={!available}
              onClick={() => onSelect(slot)}
              className={`py-2.5 rounded-lg text-sm font-medium transition ${
                selectedTime === slot
                  ? 'bg-salon-gold text-white'
                  : available
                    ? 'bg-white border border-gray-200 text-salon-dark hover:border-salon-gold'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
              }`}
            >
              {slot}
            </button>
          )
        })}
      </div>
      {slots.every(s => !isAvailable(s)) && (
        <p className="text-sm text-salon-muted mt-4 text-center">
          Aucun créneau disponible ce jour. Veuillez choisir une autre date.
        </p>
      )}
    </div>
  )
}
