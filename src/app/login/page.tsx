'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {/* Global placeholder + autofill styles */}
      <style>{`
        .login-input::placeholder {
          color: rgba(255,255,255,0.25);
          font-weight: 300;
        }
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-text-fill-color: rgba(255,255,255,0.9);
          -webkit-box-shadow: 0 0 0 40px rgba(30,24,20,1) inset !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: #C9A96E;
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* ── Background ── */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, #1A1410 0%, #2A2018 35%, #1E1814 65%, #141010 100%)',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 pointer-events-none"
          style={{
            width: '900px',
            height: '600px',
            background: 'radial-gradient(ellipse, rgba(201,169,110,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none"
          style={{
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(180,130,90,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Gold accent line — top */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-1/2 -translate-x-1/2 h-px pointer-events-none"
          style={{
            width: '200px',
            background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4), transparent)',
          }}
        />

        {/* ── Glass card ── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full mx-4"
          style={{ maxWidth: '420px' }}
        >
          {/* Card gold border glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-1px',
              borderRadius: '28px',
              background: 'linear-gradient(145deg, rgba(201,169,110,0.2), transparent 50%, rgba(201,169,110,0.1))',
            }}
          />

          <div
            style={{
              position: 'relative',
              borderRadius: '28px',
              padding: '56px 40px',
              background: 'rgba(28,22,18,0.85)',
              backdropFilter: 'blur(80px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(80px) saturate(1.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 40px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* ── Logo ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}
            >
              {/* Monogram */}
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: '-12px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(145deg, rgba(201,169,110,0.18), rgba(201,169,110,0.06))',
                    border: '1px solid rgba(201,169,110,0.3)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'serif',
                      fontStyle: 'italic',
                      fontSize: '22px',
                      fontWeight: 600,
                      color: '#C9A96E',
                      letterSpacing: '0.06em',
                      textShadow: '0 0 30px rgba(201,169,110,0.4)',
                    }}
                  >
                    BS
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.35em',
                  color: 'rgba(201,169,110,0.65)',
                  marginBottom: '16px',
                }}
              >
                Brazilian Studio
              </p>

              <h1
                style={{
                  fontFamily: 'serif',
                  fontSize: '34px',
                  fontWeight: 300,
                  textAlign: 'center',
                  lineHeight: 1,
                  color: 'rgba(255,255,255,0.95)',
                  letterSpacing: '-0.01em',
                }}
              >
                Espace Privé
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  textAlign: 'center',
                  marginTop: '12px',
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.02em',
                }}
              >
                Réservé au personnel autorisé
              </p>
            </motion.div>

            {/* Divider */}
            <div
              style={{
                width: '64px',
                height: '1px',
                margin: '0 auto 40px',
                background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.35), transparent)',
              }}
            />

            {/* ── Form ── */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
            >
              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 500,
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Adresse email
                </label>
                <div
                  style={{
                    borderRadius: '16px',
                    background: emailFocused
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.07)',
                    border: emailFocused
                      ? '1.5px solid rgba(201,169,110,0.5)'
                      : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: emailFocused
                      ? '0 0 0 4px rgba(201,169,110,0.12), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    autoComplete="email"
                    placeholder="vous@brazilianstudio.ma"
                    className="login-input"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '56px',
                      padding: '0 20px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '15px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.9)',
                      caretColor: '#C9A96E',
                      letterSpacing: '0.01em',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 500,
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Mot de passe
                </label>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    background: passwordFocused
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.07)',
                    border: passwordFocused
                      ? '1.5px solid rgba(201,169,110,0.5)'
                      : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: passwordFocused
                      ? '0 0 0 4px rgba(201,169,110,0.12), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="login-input"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '56px',
                      padding: '0 52px 0 20px',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '15px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.9)',
                      caretColor: '#C9A96E',
                      letterSpacing: '0.06em',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,169,110,0.8)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    role="alert"
                    style={{
                      fontSize: '13px',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      marginBottom: '20px',
                      color: '#F87171',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{
                  y: -2,
                  boxShadow: '0 16px 48px rgba(201,169,110,0.35), 0 0 0 1px rgba(201,169,110,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="group"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '56px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: '#1A1410',
                  background: 'linear-gradient(145deg, #D4B577 0%, #C9A96E 40%, #B8944F 100%)',
                  boxShadow: '0 6px 28px rgba(201,169,110,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {/* Shimmer */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                    opacity: 0,
                    transition: 'opacity 0.4s',
                  }}
                  className="group-hover:opacity-100"
                />
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: '2.5px solid rgba(26,20,16,0.3)',
                      borderTopColor: '#1A1410',
                    }}
                  />
                ) : (
                  <>
                    <span style={{ position: 'relative' }}>Accéder</span>
                    <ArrowRight size={17} style={{ position: 'relative', transition: 'transform 0.2s' }} className="group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                marginTop: '40px',
                fontStyle: 'italic',
                fontWeight: 300,
                color: 'rgba(201,169,110,0.3)',
                letterSpacing: '0.03em',
              }}
            >
              &ldquo;L&apos;art de vous sublimer&rdquo;
            </motion.p>
          </div>
        </motion.div>

        {/* Bottom brand */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{
            position: 'absolute',
            bottom: '32px',
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.2))' }} />
          <p style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(201,169,110,0.3)', letterSpacing: '0.3em' }}>
            Rabat
          </p>
          <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(201,169,110,0.2), transparent)' }} />
        </motion.div>
      </div>
    </>
  )
}
