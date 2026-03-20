interface Props {
  selectedDate: string
  onChange: (date: string) => void
}

export default function DateStep({ selectedDate, onChange }: Props) {
  const today = new Date().toISOString().split('T')[0]

  function isSunday(dateStr: string) {
    if (!dateStr) return false
    return new Date(dateStr + 'T12:00:00').getDay() === 0
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez une date</h2>
      <p className="text-sm text-salon-muted mb-4">Ouvert du lundi au samedi · 10h00–20h00</p>
      <input
        type="date"
        value={selectedDate}
        min={today}
        onChange={e => {
          if (!isSunday(e.target.value)) onChange(e.target.value)
        }}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-salon-gold/40 focus:border-salon-gold text-salon-dark"
      />
      {selectedDate && isSunday(selectedDate) && (
        <p className="text-sm text-red-500 mt-2">Le salon est fermé le dimanche. Veuillez choisir un autre jour.</p>
      )}
    </div>
  )
}
