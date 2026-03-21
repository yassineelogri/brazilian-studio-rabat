'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<{ id: string; name: string; phone: string; email: string | null } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data)
          setName(data.name)
          setPhone(data.phone)
        }
      })
      .catch(() => setError('Impossible de charger le profil.'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        const body = await res.json()
        setError(body.error || 'Erreur lors de la mise à jour.')
      }
    } catch {
      setError('Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mon profil</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {!profile ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                Profil mis à jour.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="block text-xs text-salon-muted mb-1">Nom</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Téléphone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Email</label>
              <input
                type="email"
                value={profile.email ?? ''}
                disabled
                className="input-field w-full text-sm bg-gray-50 text-salon-muted cursor-not-allowed"
              />
              <p className="text-xs text-salon-muted mt-1">Pour modifier votre email, contactez le salon.</p>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
