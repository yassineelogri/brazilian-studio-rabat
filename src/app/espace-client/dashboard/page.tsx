'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, LogOut, FileText, Receipt, User } from 'lucide-react'
import type { AppointmentForClient, AppointmentStatus } from '@/lib/supabase/types'
import { canCancel } from '@/lib/client-portal-utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé',
  cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
  no_show: 'bg-gray-100 text-gray-400',
}


export default function EspaceClientDashboard() {
  const router = useRouter()
  const [clientName, setClientName] = useState('')
  const [upcoming, setUpcoming] = useState<AppointmentForClient[]>([])
  const [past, setPast] = useState<AppointmentForClient[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const profileRes = await fetch('/api/client/profile')
      if (!profileRes.ok) { router.push('/espace-client'); return }
      const profile = await profileRes.json()
      setClientName(profile.name)

      const [upRes, pastRes] = await Promise.all([
        fetch('/api/client/appointments?filter=upcoming'),
        fetch('/api/client/appointments?filter=past'),
      ])
      if (upRes.ok) setUpcoming(await upRes.json())
      if (pastRes.ok) setPast(await pastRes.json())
      setLoading(false)
    }
    load()
  }, [router])

  async function handleCancel(id: string) {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(id)
    setError(null)
    const upcomingAppt = upcoming.find(a => a.id === id)
    const previousStatus = upcomingAppt?.status
    // Optimistic update
    setUpcoming(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a))
    const res = await fetch(`/api/client/appointments/${id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      // Rollback
      setUpcoming(prev => prev.map(a => a.id === id ? { ...a, status: (previousStatus ?? 'confirmed') as AppointmentStatus } : a))
      const body = await res.json()
      setError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/espace-client')
  }

  if (loading) return <div className="min-h-screen bg-salon-cream flex items-center justify-center"><p className="text-salon-muted text-sm">Chargement...</p></div>

  return (
    <div className="min-h-screen bg-salon-cream">
      {/* Header */}
      <div className="bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom px-5 pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-salon-pink/70 tracking-widest uppercase">Bonjour</p>
            <h1 className="heading-serif text-3xl text-salon-pink mt-1">{clientName} ✦</h1>
            <p className="text-xs text-salon-pink/50 mt-1">Brazilian Studio Rabat</p>
          </div>
          <button type="button" onClick={handleLogout} className="flex items-center gap-1 text-sm text-salon-pink/60 hover:text-red-400 mt-1">
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Book CTA */}
        <Link href="/booking" className="btn-primary flex items-center justify-center gap-2 w-full">
          <Plus size={16} /> Prendre un nouveau rendez-vous
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
            {error}
            <button type="button" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="text-xs font-semibold text-salon-muted uppercase tracking-wide mb-2">À venir</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-salon-muted bg-white rounded-xl border border-salon-rose/20 p-4">Aucun rendez-vous à venir.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(a => (
                <div key={a.id} className="bg-white rounded-2xl shadow-card border border-salon-rose/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="heading-serif text-base">{a.services?.name}</p>
                      <p className="text-xs font-bold text-salon-gold">
                        {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm font-bold text-salon-dark">{a.start_time.slice(0, 5)}</p>
                      {a.staff?.name && (
                        <p className="text-xs text-salon-muted mt-0.5">avec {a.staff.name}</p>
                      )}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[a.status] ?? ''}`}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                  <div className="border-t border-salon-rose/15 mt-3 pt-3 flex gap-2">
                    {canCancel(a.status, a.starts_at) ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(a.id)}
                        disabled={cancelling === a.id}
                        aria-label={`Annuler le rendez-vous du ${new Date(a.starts_at).toLocaleDateString('fr-FR')}`}
                        className="btn-secondary flex-1 text-xs"
                      >
                        {cancelling === a.id ? 'Annulation...' : 'Annuler'}
                      </button>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <Link href={`/espace-client/appointments/${a.id}`} className="btn-primary flex-1 text-xs text-center">
                      Voir détails
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-salon-muted uppercase tracking-wide mb-2">Passés</h2>
            <div className="space-y-2">
              {past.slice(0, 5).map(a => (
                <div key={a.id} className="opacity-60">
                  <div className="bg-white rounded-xl border border-salon-rose/10 p-4">
                    <p className="font-medium text-salon-dark text-sm">{a.services?.name}</p>
                    <p className="text-xs text-salon-muted">
                      {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' '}· {a.start_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer nav */}
        <div className="mt-6 pt-4 border-t border-salon-rose/20 flex justify-around">
          <Link
            href="/espace-client/devis"
            className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
            <FileText size={18} />
            <span className="text-xs">Devis</span>
          </Link>
          <Link
            href="/espace-client/factures"
            className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
            <Receipt size={18} />
            <span className="text-xs">Factures</span>
          </Link>
          <Link
            href="/espace-client/profile"
            className="flex flex-col items-center gap-1 text-salon-muted hover:text-salon-gold transition-colors">
            <User size={18} />
            <span className="text-xs">Profil</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
