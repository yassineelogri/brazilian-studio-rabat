'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: '8px',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (errorParam === 'not_found') setError("Aucun compte trouvé pour cet email. Contactez le salon.")
    else if (errorParam === 'expired') setError("Ce lien a expiré. Entrez votre email pour en recevoir un nouveau.")
    else if (errorParam === 'invalid_link') setError("Ce lien est invalide. Demandez un nouveau lien ci-dessous.")
  }, [errorParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/client/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setSent(true)
    else setError("Une erreur est survenue. Réessayez.")
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>📧</div>
        <p style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>Lien envoyé !</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', marginBottom: '20px' }}>
          Un lien de connexion a été envoyé à <strong style={{ color: '#C9A96E' }}>{email}</strong>. Vérifiez vos emails.
        </p>
        <button type="button" onClick={() => { setSent(false); setEmail('') }}
          style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
          Utiliser une autre adresse
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ fontSize: '18px', fontFamily: 'serif', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>Connexion</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Entrez votre email pour recevoir un lien de connexion.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div>
        <label style={labelStyle}>Adresse email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={inputStyle} />
      </div>

      <button type="submit" disabled={loading}
        style={{ padding: '13px', background: loading ? 'rgba(201,169,110,0.4)' : 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
        {loading ? 'Envoi...' : 'Recevoir mon lien de connexion'}
      </button>
    </form>
  )
}

export default function EspaceClientLoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#141210', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(201,169,110,0.3)' }}>
          <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', fontWeight: 700, color: '#1A1410' }}>BS</span>
        </div>
        <p style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '18px', color: '#C9A96E' }}>Brazilian Studio</p>
        <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(201,169,110,0.4)', textTransform: 'uppercase', marginTop: '4px' }}>Espace Client · Rabat</p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '380px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', width: '60%' }} />
            <div style={{ height: '44px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
            <div style={{ height: '44px', background: 'rgba(201,169,110,0.15)', borderRadius: '12px' }} />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
