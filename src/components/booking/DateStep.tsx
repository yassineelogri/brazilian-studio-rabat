import styles from './Booking.module.css'

interface Props {
  selectedDate: string
  onChange: (date: string) => void
}

interface DayOption {
  value: string
  dow: string
  date: string
}

/* Next 14 reservation days */
function buildDays(): DayOption[] {
  const days: DayOption[] = []
  const cursor = new Date()
  const dowFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

  while (days.length < 14) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const isToday = days.length === 0 && cursor.getDate() === new Date().getDate()
    days.push({
      value,
      dow: isToday ? 'Auj.' : dowFmt.format(cursor).replace('.', ''),
      date: dateFmt.format(cursor),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export default function DateStep({ selectedDate, onChange }: Props) {
  const days = buildDays()

  return (
    <div>
      <h2 className={styles.stepTitle}>Quel jour vous convient ?</h2>
      <p className={styles.stepHint}>Ouvert tous les jours, de 10h à 20h.</p>

      <div className={styles.dayGrid}>
        {days.map(day => (
          <button
            key={day.value}
            className={styles.dayChip}
            data-selected={selectedDate === day.value}
            onClick={() => onChange(day.value)}
          >
            <span className={styles.dayChipDow}>{day.dow}</span>
            <span className={styles.dayChipDate}>{day.date}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
