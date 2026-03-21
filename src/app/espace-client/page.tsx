'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (errorParam === 'not_found') {
      setError("Aucun compte trouvé pour cet email. Contactez le salon.")
    } else if (errorParam === 'expired') {
      // Link expired — show message and keep form visible so client can request a new link
      setError("Ce lien a expiré. Entrez votre email pour en recevoir un nouveau.")
    } else if (errorParam === 'invalid_link') {
      setError("Ce lien est invalide. Demandez un nouveau lien ci-dessous.")
    }
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
    if (res.ok) {
      setSent(true)
    } else {
      setError("Une erreur est survenue. Réessayez.")
    }
  }

  return (
    <div className="bg-white rounded-xl border border-salon-rose/20 p-6 shadow-sm">
      {sent ? (
        <div className="text-center space-y-3">
          <div className="text-3xl">📧</div>
          <p className="font-medium text-salon-dark">Lien envoyé !</p>
          <p className="text-sm text-salon-muted">
            Un lien de connexion a été envoyé à <strong>{email}</strong>. Vérifiez vos emails.
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setEmail('') }}
            className="text-sm text-salon-pink hover:underline"
          >
            Utiliser une autre adresse
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="font-medium text-salon-dark mb-1">Connexion</h2>
            <p className="text-xs text-salon-muted">
              Entrez votre email pour recevoir un lien de connexion.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-salon-muted mb-1">Adresse email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="input-field w-full text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Envoi...' : 'Recevoir mon lien de connexion'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function EspaceClientLoginPage() {
  return (
    <div className="min-h-screen bg-salon-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-salon-dark">Brazilian Studio Rabat</h1>
          <p className="text-salon-muted text-sm mt-1">Espace Client</p>
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-xl border border-salon-rose/20 p-6 shadow-sm text-center text-sm text-salon-muted">
            Chargement...
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
