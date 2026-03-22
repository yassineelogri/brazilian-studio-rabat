'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

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

    router.push('/dashboard/calendar')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* LEFT PANEL (desktop) / TOP HEADER (mobile) */}
      <div className="relative md:w-2/5 bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom flex flex-col items-center justify-center pt-12 pb-10 md:py-0 md:min-h-screen overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute bottom-16 right-0 w-48 h-48 rounded-full bg-salon-rose/5 translate-x-1/2 pointer-events-none" />
        <div className="absolute top-10 left-6 w-32 h-32 rounded-full bg-salon-gold/8 -translate-x-1/2 pointer-events-none" />
        <div className="absolute top-1/2 right-4 w-24 h-24 rounded-full bg-salon-pink/5 translate-y-8 pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <div className="w-14 h-14 rounded-full bg-salon-rose/20 flex items-center justify-center ring-1 ring-salon-rose/30">
            <span className="font-serif text-xl font-bold text-salon-pink leading-none">BS</span>
          </div>
          <h1 className="font-serif text-3xl text-salon-pink mt-4 leading-snug">Brazilian Studio</h1>
          <p className="text-sm text-salon-pink/60 tracking-[0.3em] uppercase mt-1">Rabat</p>

          {/* Decorative rule with gold dots */}
          <div className="flex items-center gap-2 mt-4">
            <div className="h-px w-12 bg-salon-gold/30" />
            <div className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-salon-gold/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-salon-gold/80" />
              <span className="w-1 h-1 rounded-full bg-salon-gold/60" />
            </div>
            <div className="h-px w-12 bg-salon-gold/30" />
          </div>
        </div>

        {/* Quote — larger and more prominent */}
        <p className="relative z-10 italic text-salon-pink/60 text-base px-10 text-center mt-8 md:absolute md:bottom-10 md:left-0 md:right-0 md:mt-0 leading-relaxed">
          &ldquo;L&rsquo;art de vous sublimer&rdquo;
        </p>
      </div>

      {/* RIGHT PANEL (desktop) / CARD SHEET (mobile) */}
      <div className="md:flex-1 bg-salon-cream-light flex items-center justify-center p-6 md:p-8 -mt-4 rounded-t-3xl md:mt-0 md:rounded-none flex-1">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-2xl shadow-card border border-salon-rose/20 w-full max-w-sm overflow-hidden"
        >
          {/* Premium gradient bar at top */}
          <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-salon-pink/30 to-transparent" />

          <div className="p-8">
            <h2 className="font-serif text-2xl text-salon-dark mb-1">Espace staff</h2>
            <p className="text-sm text-salon-muted mb-6">Connectez-vous pour continuer</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-salon-dark mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="vous@brazilianstudio.ma"
                  className="w-full h-11 px-4 border border-salon-rose/30 rounded-lg text-salon-dark placeholder:text-salon-muted/50 focus:outline-none focus:border-salon-gold focus:ring-2 focus:ring-salon-gold/20 transition-colors duration-200"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-salon-dark mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-11 px-4 pr-11 border border-salon-rose/30 rounded-lg text-salon-dark placeholder:text-salon-muted/50 focus:outline-none focus:border-salon-gold focus:ring-2 focus:ring-salon-gold/20 transition-colors duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-salon-muted/60 hover:text-salon-gold transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-salon-dark to-salon-sidebar-bottom text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
