'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }
    
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    
    setLoading(false)
    if (updateError) {
      setError("Une erreur est survenue lors de l'enregistrement.")
    } else {
      window.location.href = '/espace-client/dashboard'
    }
  }

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
      <div style={{ zIndex: 1, width: '100%', maxWidth: '400px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
          <form 
            onSubmit={handleSetPassword} 
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div>
              <p style={{ fontSize: '22px', fontFamily: 'serif', fontWeight: 400, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#E2A7B5" /> Sécurisez votre compte
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Veuillez créer un mot de passe pour vos prochaines connexions, afin de ne plus avoir besoin de code par email.
              </p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px' }}>
                {error}
              </motion.div>
            )}

            <div>
              <label style={labelStyle}>Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ ...inputStyle, paddingLeft: '44px' }} 
                />
              </div>
            </div>

            <button type="submit" disabled={loading || password.length < 6}
              style={{ 
                padding: '14px', 
                background: (loading || password.length < 6) ? 'rgba(226, 167, 181, 0.4)' : 'linear-gradient(135deg, #E2A7B5 0%, #C98FA0 100%)', 
                color: '#2B1B1E', 
                borderRadius: '12px', 
                fontWeight: 600, 
                border: 'none', 
                cursor: (loading || password.length < 6) ? 'not-allowed' : 'pointer', 
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: (loading || password.length < 6) ? 'none' : '0 4px 14px rgba(226, 167, 181, 0.25)',
                transition: 'all 0.2s ease'
              }}>
              {loading ? 'Enregistrement...' : (
                <>Enregistrer <ArrowRight size={18} /></>
              )}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button type="button" onClick={() => window.location.href = '/espace-client/dashboard'}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                Ignorer pour le moment
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
