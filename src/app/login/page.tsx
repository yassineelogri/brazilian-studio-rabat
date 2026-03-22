'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
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

    router.push('/dashboard/calendar')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* LEFT PANEL (desktop) / TOP HEADER (mobile) */}
      <div className="relative md:w-2/5 bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom flex flex-col items-center justify-center pt-12 pb-10 md:py-0 md:min-h-screen overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute bottom-16 right-0 w-48 h-48 rounded-full bg-salon-rose/5 translate-x-1/2 pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <div className="w-12 h-12 rounded-full bg-salon-rose/20 flex items-center justify-center">
            <span className="font-serif text-xl font-bold text-salon-pink leading-none">BS</span>
          </div>
          <h1 className="font-serif text-3xl text-salon-pink mt-4 leading-snug">Brazilian Studio</h1>
          <p className="text-sm text-salon-pink/60 tracking-[0.3em] uppercase mt-1">Rabat</p>
        </div>

        {/* Quote */}
        <p className="relative z-10 italic text-salon-pink/40 text-sm px-8 text-center mt-8 md:absolute md:bottom-10 md:left-0 md:right-0 md:mt-0">
          &ldquo;L&rsquo;art de vous sublimer&rdquo;
        </p>
      </div>

      {/* RIGHT PANEL (desktop) / CARD SHEET (mobile) */}
      <div className="md:flex-1 bg-salon-cream-light flex items-center justify-center p-6 md:p-8 -mt-4 rounded-t-3xl md:mt-0 md:rounded-none flex-1">
        <div className="bg-white rounded-2xl shadow-card border border-salon-rose/20 p-8 w-full max-w-sm">
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
              className="w-full h-11 bg-salon-gold text-white rounded-lg font-medium hover:bg-salon-dark transition-colors duration-200 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
