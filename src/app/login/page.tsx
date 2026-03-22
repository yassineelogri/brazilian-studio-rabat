'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ── Background layers ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #1A1410 0%, #2A2018 35%, #1E1814 65%, #141010 100%)',
        }}
      />

      {/* Warm ambient glow — top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 pointer-events-none"
        style={{
          width: '900px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(201,169,110,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Warm ambient glow — bottom-right */}
      <div
        className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(180,130,90,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Subtle noise texture overlay */}
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
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Card glow behind */}
        <div
          className="absolute -inset-px rounded-[28px] pointer-events-none"
          style={{
            background: 'linear-gradient(145deg, rgba(201,169,110,0.15), transparent 50%, rgba(201,169,110,0.08))',
          }}
        />

        <div
          className="relative rounded-[28px] px-10 py-14 sm:px-12"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(80px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(80px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 40px 80px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* ── Logo ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center mb-12"
          >
            {/* Monogram */}
            <div className="relative mb-6">
              {/* Outer glow ring */}
              <div
                className="absolute -inset-3 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)',
                }}
              />
              <div
                className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))',
                  border: '1px solid rgba(201,169,110,0.25)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  className="font-serif italic text-xl font-semibold"
                  style={{
                    color: '#C9A96E',
                    letterSpacing: '0.06em',
                    textShadow: '0 0 24px rgba(201,169,110,0.3)',
                  }}
                >
                  BS
                </span>
              </div>
            </div>

            {/* Brand */}
            <p
              className="text-[10px] uppercase font-medium tracking-[0.35em] mb-4"
              style={{ color: 'rgba(201,169,110,0.7)' }}
            >
              Brazilian Studio
            </p>

            {/* Title */}
            <h1
              className="font-serif text-[32px] font-light text-center leading-none tracking-tight"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              Espace Privé
            </h1>
            <p
              className="text-[13px] text-center mt-3 font-light"
              style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}
            >
              Réservé au personnel autorisé
            </p>
          </motion.div>

          {/* ── Divider ── */}
          <div
            className="w-16 h-px mx-auto mb-10"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.3), transparent)',
            }}
          />

          {/* ── Form ── */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-medium mb-2.5 uppercase tracking-[0.14em]"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Adresse email
              </label>
              <div
                className="relative rounded-2xl transition-all duration-300"
                style={{
                  background: emailFocused
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  border: emailFocused
                    ? '1px solid rgba(201,169,110,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: emailFocused
                    ? '0 0 0 4px rgba(201,169,110,0.08), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
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
                  className="w-full h-[52px] px-5 bg-transparent text-sm outline-none"
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    caretColor: '#C9A96E',
                    letterSpacing: '0.01em',
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-medium mb-2.5 uppercase tracking-[0.14em]"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                Mot de passe
              </label>
              <div
                className="relative rounded-2xl transition-all duration-300"
                style={{
                  background: passwordFocused
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  border: passwordFocused
                    ? '1px solid rgba(201,169,110,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: passwordFocused
                    ? '0 0 0 4px rgba(201,169,110,0.08), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
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
                  className="w-full h-[52px] px-5 pr-12 bg-transparent text-sm outline-none"
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    caretColor: '#C9A96E',
                    letterSpacing: '0.04em',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  className="absolute inset-y-0 right-0 flex items-center px-4 transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(201,169,110,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  role="alert"
                  className="text-[13px] px-4 py-3 rounded-xl overflow-hidden"
                  style={{
                    color: '#F87171',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
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
                boxShadow: '0 12px 40px rgba(201,169,110,0.3), 0 0 0 1px rgba(201,169,110,0.3)',
              }}
              whileTap={{ scale: 0.975 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative w-full h-[52px] rounded-2xl font-medium text-sm overflow-hidden disabled:opacity-40 group"
              style={{
                background: 'linear-gradient(135deg, #C9A96E 0%, #B8944F 50%, #A6833E 100%)',
                boxShadow: '0 4px 24px rgba(201,169,110,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                letterSpacing: '0.08em',
                color: '#1A1410',
              }}
            >
              {/* Button shimmer effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <>
                    Accéder
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </motion.button>
          </motion.form>

          {/* ── Footer ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center text-[11px] mt-10 italic font-light"
            style={{ color: 'rgba(201,169,110,0.35)', letterSpacing: '0.03em' }}
          >
            &ldquo;L&apos;art de vous sublimer&rdquo;
          </motion.p>
        </div>
      </motion.div>

      {/* ── Bottom brand ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3"
      >
        <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.2))' }} />
        <p className="text-[10px] uppercase font-light" style={{ color: 'rgba(201,169,110,0.3)', letterSpacing: '0.3em' }}>
          Rabat
        </p>
        <div className="h-px w-10" style={{ background: 'linear-gradient(90deg, rgba(201,169,110,0.2), transparent)' }} />
      </motion.div>
    </div>
  )
}
