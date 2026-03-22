'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(145deg, #FAF8F5 0%, #F5EFE8 50%, #F0E8E0 100%)' }}
    >
      {/* Subtle warm vignette corners */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(180,145,120,0.08) 100%)',
        }}
      />

      {/* Gold shimmer top-center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #C9A96E55, transparent)' }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div
          className="rounded-2xl px-10 py-12"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 8px 32px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.05)',
          }}
        >
          {/* Logo mark */}
          <div className="flex flex-col items-center mb-10">
            {/* Gold monogram ring */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{
                background: 'linear-gradient(135deg, #F5EFE8, #EDE4D8)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 2px 8px rgba(180,145,100,0.12)',
              }}
            >
              {/* Thin gold ring */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ border: '1px solid rgba(201,169,110,0.35)' }}
              >
                <span
                  className="font-serif italic text-lg font-semibold"
                  style={{ color: '#C9A96E', letterSpacing: '0.05em' }}
                >
                  BS
                </span>
              </div>
            </div>

            {/* Brand name */}
            <p
              className="text-[10px] uppercase font-medium mb-3"
              style={{ color: '#C9A96E', letterSpacing: '0.3em' }}
            >
              Brazilian Studio
            </p>

            {/* Title */}
            <h1
              className="font-serif text-3xl font-normal text-center leading-tight"
              style={{ color: '#1A1512', letterSpacing: '-0.01em' }}
            >
              Espace Privé
            </h1>
            <p
              className="text-sm text-center mt-2"
              style={{ color: '#9B8E85', letterSpacing: '0.01em' }}
            >
              Réservé au personnel autorisé
            </p>
          </div>

          {/* Thin gold divider */}
          <div
            className="w-12 h-px mx-auto mb-9"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A96E60, transparent)' }}
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-medium mb-2 uppercase"
                style={{ color: '#9B8E85', letterSpacing: '0.12em' }}
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="vous@brazilianstudio.ma"
                className="w-full px-5 text-sm transition-all duration-200 outline-none"
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  background: '#F7F4F0',
                  border: '1px solid transparent',
                  color: '#1A1512',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                }}
                onFocus={e => {
                  e.target.style.border = '1px solid rgba(201,169,110,0.4)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(201,169,110,0.08), inset 0 1px 3px rgba(0,0,0,0.02)'
                  e.target.style.background = '#FFFFFF'
                }}
                onBlur={e => {
                  e.target.style.border = '1px solid transparent'
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)'
                  e.target.style.background = '#F7F4F0'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-medium mb-2 uppercase"
                style={{ color: '#9B8E85', letterSpacing: '0.12em' }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-5 pr-12 text-sm transition-all duration-200 outline-none"
                  style={{
                    height: '52px',
                    borderRadius: '12px',
                    background: '#F7F4F0',
                    border: '1px solid transparent',
                    color: '#1A1512',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onFocus={e => {
                    e.target.style.border = '1px solid rgba(201,169,110,0.4)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(201,169,110,0.08), inset 0 1px 3px rgba(0,0,0,0.02)'
                    e.target.style.background = '#FFFFFF'
                  }}
                  onBlur={e => {
                    e.target.style.border = '1px solid transparent'
                    e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)'
                    e.target.style.background = '#F7F4F0'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  className="absolute inset-y-0 right-0 flex items-center px-4 transition-colors duration-200"
                  style={{ color: '#C5B8AE' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#9B8E85')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#C5B8AE')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="text-xs px-4 py-3 rounded-xl"
                style={{
                  color: '#B04040',
                  background: 'rgba(180,64,64,0.06)',
                  border: '1px solid rgba(180,64,64,0.12)',
                }}
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.005, boxShadow: '0 8px 32px rgba(26,21,18,0.22)' }}
              whileTap={{ scale: 0.997 }}
              transition={{ duration: 0.15 }}
              className="w-full font-medium text-sm text-white transition-all duration-200 disabled:opacity-50"
              style={{
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1A1512 0%, #2D2420 100%)',
                boxShadow: '0 4px 20px rgba(26,21,18,0.18)',
                letterSpacing: '0.04em',
              }}
            >
              {loading ? 'Connexion...' : 'Accéder'}
            </motion.button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-[11px] mt-8 italic"
            style={{ color: '#C5B8AE', letterSpacing: '0.02em' }}
          >
            &ldquo;L&apos;art de vous sublimer&rdquo;
          </p>
        </div>
      </motion.div>

      {/* Bottom brand line */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        <div className="h-px w-8" style={{ background: 'rgba(201,169,110,0.3)' }} />
        <p className="text-[10px] uppercase" style={{ color: '#C9A96E', letterSpacing: '0.25em', opacity: 0.6 }}>
          Rabat
        </p>
        <div className="h-px w-8" style={{ background: 'rgba(201,169,110,0.3)' }} />
      </div>
    </div>
  )
}
