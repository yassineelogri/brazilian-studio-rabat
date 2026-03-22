interface ClientInfo {
  name: string
  phone: string
  email: string
}

interface Props {
  info: ClientInfo
  onChange: (info: ClientInfo) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: '6px',
}

export default function ClientInfoStep({ info, onChange }: Props) {
  function update(field: keyof ClientInfo, value: string) {
    onChange({ ...info, [field]: value })
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '20px', marginTop: '32px' }}>Vos coordonnées</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Nom complet *</label>
          <input type="text" value={info.name} onChange={e => update('name', e.target.value)} required placeholder="Votre nom" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Téléphone *</label>
          <input type="tel" value={info.phone} onChange={e => update('phone', e.target.value)} required placeholder="06 XX XX XX XX" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', fontSize: '11px' }}>(optionnel — pour la confirmation)</span></label>
          <input type="email" value={info.email} onChange={e => update('email', e.target.value)} placeholder="votre@email.com" style={inputStyle} />
        </div>
      </div>
    </div>
  )
}
