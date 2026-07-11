'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

interface Props {
  initialName: string
  onDone: (profile: { name: string; phone: string }) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.92)',
  fontSize: '15px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'rgba(226,167,181,0.7)', textTransform: 'uppercase',
  letterSpacing: '0.12em', marginBottom: '7px',
}

export default function CompleteProfile({ initialName, onDone }: Props) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneOk = phone.replace(/\D/g, '').length >= 9
  const canSave = name.trim().length >= 2 && phoneOk && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
    })
    setSaving(false)
    if (!res.ok) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      return
    }
    const updated = await res.json()
    onDone({ name: updated.name, phone: updated.phone })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#221418', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Welcome header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(226,167,181,0.2), rgba(226,167,181,0.06))', border: '1px solid rgba(226,167,181,0.3)' }}>
            <Sparkles size={22} style={{ color: '#E2A7B5' }} />
          </div>
          <p style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(226,167,181,0.65)', fontWeight: 600, marginBottom: '8px' }}>
            Brazilian Club
          </p>
          <h1 style={{ fontFamily: 'serif', fontSize: '26px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', marginBottom: '8px' }}>
            Bienvenue ✦
          </h1>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: '34ch', margin: '0 auto' }}>
            Encore un instant : vos coordonnées pour personnaliser votre carte de fidélité.
          </p>
        </div>

        {/* Form card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label htmlFor="cp-name" style={labelStyle}>Nom complet</label>
              <input
                id="cp-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Votre nom et prénom"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="cp-phone" style={labelStyle}>Téléphone</label>
              <input
                id="cp-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="06 XX XX XX XX"
                style={inputStyle}
              />
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', lineHeight: 1.5 }}>
                Utilisé uniquement pour confirmer vos rendez-vous.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '10px 12px' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{
                padding: '13px',
                borderRadius: '50px',
                border: 'none',
                background: 'linear-gradient(135deg, #E2A7B5, #C98FA0)',
                color: '#2B1B1E',
                fontWeight: 700,
                fontSize: '14.5px',
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: canSave ? 1 : 0.45,
                boxShadow: canSave ? '0 4px 20px rgba(226,167,181,0.25)' : 'none',
                transition: 'opacity 0.3s, box-shadow 0.3s',
              }}
            >
              {saving ? 'Enregistrement…' : 'Découvrir ma carte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
