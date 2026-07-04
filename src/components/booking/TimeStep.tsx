'use client'

import { useEffect, useState } from 'react'
import { Sunrise, Sun, Sunset } from 'lucide-react'
import styles from './Booking.module.css'

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

  const groups = [
    { label: 'Matin', icon: <Sunrise size={14} />, slots: slots.filter(s => timeToMinutes(s) < 13 * 60) },
    { label: 'Après-midi', icon: <Sun size={14} />, slots: slots.filter(s => timeToMinutes(s) >= 13 * 60 && timeToMinutes(s) < 17 * 60) },
    { label: 'Soir', icon: <Sunset size={14} />, slots: slots.filter(s => timeToMinutes(s) >= 17 * 60) },
  ].filter(g => g.slots.length > 0)

  if (loading) {
    return (
      <div>
        <h2 className={styles.stepTitle}>À quelle heure ?</h2>
        <p className={styles.stepHint}>Chargement des disponibilités…</p>
      </div>
    )
  }

  const noneAvailable = slots.every(s => !isAvailable(s))

  return (
    <div>
      <h2 className={styles.stepTitle}>À quelle heure ?</h2>
      <p className={styles.stepHint}>Les horaires barrés sont déjà réservés.</p>

      {noneAvailable ? (
        <p className={styles.emptySlots}>
          Cette journée est complète. Choisissez une autre date, ou écrivez-nous sur WhatsApp : nous trouvons toujours une solution.
        </p>
      ) : (
        groups.map(group => (
          <div key={group.label} className={styles.slotGroup}>
            <span className={styles.slotGroupLabel}>{group.icon} {group.label}</span>
            <div className={styles.slotGrid}>
              {group.slots.map(slot => {
                const available = isAvailable(slot)
                return (
                  <button
                    key={slot}
                    disabled={!available}
                    className={styles.slot}
                    data-selected={selectedTime === slot}
                    onClick={() => onSelect(slot)}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
