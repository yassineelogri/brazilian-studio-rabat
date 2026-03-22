'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Full-screen background */}
      <div className="absolute inset-0 bg-gradient-to-br from-salon-sidebar-bottom via-salon-dark to-[#2a1215]" />

      {/* Blurred orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full bg-salon-rose/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-salon-gold/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-salon-pink/5 blur-[140px] pointer-events-none" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #F8D7DA 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div
          className="rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          {/* Top shimmer */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-salon-rose/60 to-transparent" />

          <div className="px-8 pt-8 pb-9">
            {/* Logo */}
            <div className="flex flex-col items-center mb-7">
              <div className="w-14 h-14 rounded-2xl border border-white/15 flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span className="font-serif italic text-salon-pink text-xl font-bold">BS</span>
              </div>
              <h1 className="font-serif text-2xl text-white text-center">Bienvenue</h1>
              <p className="text-sm text-white/45 mt-1 text-center">
                Connectez-vous à votre espace staff
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="vous@brazilianstudio.ma"
                  className="w-full h-11 px-4 rounded-xl text-sm text-white placeholder:text-white/20 border border-white/10 focus:outline-none focus:border-salon-rose/50 focus:ring-1 focus:ring-salon-rose/20 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[11px] font-medium text-white/50 mb-1.5 uppercase tracking-wider">
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
                    className="w-full h-11 px-4 pr-11 rounded-xl text-sm text-white placeholder:text-white/20 border border-white/10 focus:outline-none focus:border-salon-rose/50 focus:ring-1 focus:ring-salon-rose/20 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-medium text-sm text-white transition-all duration-200 disabled:opacity-50 mt-2 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #6B3A3F 0%, #4A2528 100%)',
                  boxShadow: '0 4px 24px rgba(107,58,63,0.5)',
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <p className="text-center text-[11px] text-white/20 mt-6 italic">
              &ldquo;L&apos;art de vous sublimer&rdquo; — Brazilian Studio Rabat
            </p>
          </div>

          {/* Bottom shimmer */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-salon-gold/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  )
}
