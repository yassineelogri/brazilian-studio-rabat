interface Props {
  selectedDate: string
  onChange: (date: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px', outline: 'none',
  colorScheme: 'dark',
}

export default function DateStep({ selectedDate, onChange }: Props) {
  const today = new Date().toISOString().split('T')[0]

  function isSunday(dateStr: string) {
    if (!dateStr) return false
    return new Date(dateStr + 'T12:00:00').getDay() === 0
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '6px', marginTop: '32px' }}>Choisissez une date</h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Ouvert du lundi au samedi · 10h00–20h00</p>
      <input
        type="date"
        value={selectedDate}
        min={today}
        onChange={e => { if (!isSunday(e.target.value)) onChange(e.target.value) }}
        style={inputStyle}
      />
      {selectedDate && isSunday(selectedDate) && (
        <p style={{ fontSize: '13px', color: '#F87171', marginTop: '8px' }}>Le salon est fermé le dimanche. Veuillez choisir un autre jour.</p>
      )}
    </div>
  )
}
