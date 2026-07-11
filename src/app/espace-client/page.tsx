'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, KeyRound, Mail, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  width: '100%', 
  padding: '14px 16px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '15px', 
  outline: 'none',
  transition: 'all 0.2s ease',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase',
  letterSpacing: '0.15em', marginBottom: '8px',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorParam = searchParams.get('error')
  
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (errorParam === 'not_found') setError("Aucun compte trouvé pour cet email. Contactez le salon.")
    else if (errorParam === 'expired') setError("Ce lien a expiré. Demandez-en un nouveau.")
    else if (errorParam === 'invalid_link') setError("Lien invalide. Demandez un nouveau lien ci-dessous.")
  }, [errorParam])

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/client/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) {
      setStep('otp')
    } else {
      const data = await res.json().catch(() => ({}))
      if (res.status === 429 || data.error === 'rate_limit') {
        setError("Veuillez patienter 60 secondes avant de demander un nouveau code.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/client/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    })
    setLoading(false)
    if (res.ok) {
      window.location.href = '/espace-client/dashboard'
    } else {
      const data = await res.json()
      if (data.error === 'invalid_code') {
        setError("Code incorrect ou expiré. Veuillez réessayer.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.form 
            key="email-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSendEmail} 
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div>
              <p style={{ fontSize: '22px', fontFamily: 'serif', fontWeight: 400, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#E2A7B5" /> Bienvenue
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Entrez votre email pour recevoir votre code d'accès sécurisé.
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px' }}>
                {error}
              </motion.div>
            )}

            <div>
              <label style={labelStyle}>Adresse email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="votre@email.com" 
                  style={{ ...inputStyle, paddingLeft: '44px' }} 
                />
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ 
                padding: '14px', 
                background: loading ? 'rgba(226, 167, 181, 0.4)' : 'linear-gradient(135deg, #E2A7B5 0%, #C98FA0 100%)', 
                color: '#2B1B1E', 
                borderRadius: '12px', 
                fontWeight: 600, 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(226, 167, 181, 0.25)',
                transition: 'all 0.2s ease'
              }}>
              {loading ? 'Envoi...' : (
                <>Continuer <ArrowRight size={18} /></>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.form 
            key="otp-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleVerifyOtp} 
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div>
              <p style={{ fontSize: '22px', fontFamily: 'serif', fontWeight: 400, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#E2A7B5" /> Code de vérification
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Nous avons envoyé un code à 6 chiffres à <strong style={{ color: '#E2A7B5', fontWeight: 500 }}>{email}</strong>
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px' }}>
                {error}
              </motion.div>
            )}

            <div>
              <label style={labelStyle}>Code à 8 chiffres</label>
              <input 
                type="text" 
                required 
                maxLength={8}
                value={token} 
                onChange={e => setToken(e.target.value.replace(/\D/g, ''))} 
                placeholder="00000000" 
                style={{ ...inputStyle, textAlign: 'center', fontSize: '24px', letterSpacing: '0.5em', padding: '16px' }} 
              />
            </div>

            <button type="submit" disabled={loading || token.length < 8}
              style={{ 
                padding: '14px', 
                background: (loading || token.length < 8) ? 'rgba(226, 167, 181, 0.4)' : 'linear-gradient(135deg, #E2A7B5 0%, #C98FA0 100%)', 
                color: (loading || token.length < 8) ? 'rgba(43, 27, 30, 0.5)' : '#2B1B1E', 
                borderRadius: '12px', 
                fontWeight: 600, 
                border: 'none', 
                cursor: (loading || token.length < 8) ? 'not-allowed' : 'pointer', 
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: (loading || token.length < 8) ? 'none' : '0 4px 14px rgba(226, 167, 181, 0.25)',
                transition: 'all 0.2s ease'
              }}>
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>

            <button type="button" onClick={() => { setStep('email'); setToken(''); setError(null) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', marginTop: '-8px' }}>
              Utiliser une autre adresse
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function EspaceClientLoginPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at 50% 0%, #3A2027 0%, #170E11 100%)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '24px',
      position: 'relative'
    }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,167,181,0.05) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(201,143,160,0.05) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

      <div style={{ zIndex: 1, width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <div style={{ 
            width: '64px', height: '64px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #E2A7B5 0%, #C98FA0 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 16px', 
            boxShadow: '0 12px 32px rgba(226, 167, 181, 0.2), inset 0 2px 4px rgba(255,255,255,0.4)' 
          }}>
            <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '22px', fontWeight: 700, color: '#2B1B1E' }}>BS</span>
          </div>
          <p style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '24px', color: '#fff' }}>Brazilian Studio</p>
          <p style={{ fontSize: '11px', letterSpacing: '0.35em', color: '#E2A7B5', textTransform: 'uppercase', marginTop: '8px', fontWeight: 600 }}>Espace Client</p>
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ 
            width: '100%', 
            background: 'rgba(30, 20, 24, 0.6)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '24px', 
            padding: '32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
          }}
        >
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', width: '50%' }} />
              <div style={{ height: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', width: '80%', marginBottom: '16px' }} />
              <div style={{ height: '48px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
              <div style={{ height: '48px', background: 'rgba(226, 167, 181,0.1)', borderRadius: '12px' }} />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
