'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AppointmentForClient } from '@/lib/supabase/types'
import type { AppointmentStatus } from '@/lib/supabase/types'
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

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [appt, setAppt] = useState<AppointmentForClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/client/appointments')
      .then(res => res.ok ? res.json() : [])
      .then((data: AppointmentForClient[]) => {
        const found = data.find(a => a.id === params.id)
        setAppt(found ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleCancel() {
    if (!appt) return
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(true)
    setError(null)
    const previousStatus = appt.status
    // Optimistic update
    setAppt(prev => prev ? { ...prev, status: 'cancelled' as AppointmentStatus } : prev)
    const res = await fetch(`/api/client/appointments/${params.id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      // Rollback to actual previous status
      setAppt(prev => prev ? { ...prev, status: previousStatus } : prev)
      const body = await res.json().catch(() => ({}))
      setError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-salon-cream flex items-center justify-center">
        <p className="text-salon-muted text-sm">Chargement...</p>
      </div>
    )
  }

  if (!appt) {
    return (
      <div className="min-h-screen bg-salon-cream flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-salon-muted">Rendez-vous introuvable.</p>
          <Link href="/espace-client/dashboard" className="text-sm text-salon-pink hover:underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Rendez-vous</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-salon-dark">{appt.services?.name}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status] ?? ''}`}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-salon-rose/20 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-salon-muted">Date</span>
              <span className="font-medium">{new Date(appt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-salon-muted">Heure</span>
              <span className="font-medium">{appt.start_time.slice(0, 5)}</span>
            </div>
            {appt.staff?.name && (
              <div className="flex justify-between">
                <span className="text-salon-muted">Avec</span>
                <span className="font-medium">{appt.staff.name}</span>
              </div>
            )}
            {appt.notes && (
              <div className="flex justify-between">
                <span className="text-salon-muted">Notes</span>
                <span className="text-salon-dark">{appt.notes}</span>
              </div>
            )}
          </div>

          {canCancel(appt.status, appt.starts_at) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-xl py-2 hover:bg-red-50 transition"
            >
              {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
