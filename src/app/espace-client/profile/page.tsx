'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CalendarDays, FileText, Receipt, User, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px', color: 'rgba(255,255,255,0.9)',
  fontSize: '14px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: '6px',
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<{ id: string; name: string; phone: string; email: string | null } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setProfile(data); setName(data.name); setPhone(data.phone) } })
      .catch(() => setError('Impossible de charger le profil.'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })
      if (res.ok) setSuccess(true)
      else { const body = await res.json(); setError(body.error || 'Erreur lors de la mise à jour.') }
    } catch { setError('Erreur lors de la mise à jour.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#141210', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: '#1C1816', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Link href="/espace-client/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: '8px' }}>
            <ChevronLeft size={14} /> Retour
          </Link>
          <h1 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Mon profil</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        {!profile ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {success && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                Profil mis à jour.
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                {error}
              </div>
            )}
            <div>
              <label style={labelStyle}>Nom</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={profile.email ?? ''} disabled style={{ ...inputStyle, opacity: 0.4, cursor: 'not-allowed' }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>Pour modifier votre email, contactez le salon.</p>
            </div>
            <button type="submit" disabled={saving}
              style={{ padding: '12px', background: saving ? 'rgba(201,169,110,0.4)' : 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1C1816', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { href: '/espace-client/dashboard', label: 'Accueil', icon: CalendarDays },
          { href: '/espace-client/devis', label: 'Devis', icon: FileText },
          { href: '/espace-client/factures', label: 'Factures', icon: Receipt },
          { href: '/espace-client/profile', label: 'Profil', icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', color: href === '/espace-client/profile' ? '#C9A96E' : 'rgba(255,255,255,0.35)' }}>
            <Icon size={18} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
