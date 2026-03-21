'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { canCancel } from '@/lib/client-portal-utils'
import type { AppointmentStatus } from '@/lib/supabase/types'

interface TokenData {
  id: string
  date: string
  start_time: string
  status: string
  notes: string | null
  starts_at: string
  clients: { name: string }
  services: { name: string; color: string }
  staff: { name: string } | null
}


const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé',
  cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent',
}

export default function TokenViewPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<TokenData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'expired' | 'not_found'>('loading')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    fetch(`/api/client/tokens/${params.token}`)
      .then(async res => {
        if (res.ok) { setData(await res.json()); setStatus('ok') }
        else if (res.status === 410) setStatus('expired')
        else setStatus('not_found')
      })
      .catch(() => setStatus('not_found'))
  }, [params.token])

  async function handleCancel() {
    if (!confirm('Annuler ce rendez-vous ?')) return
    setCancelling(true)
    setCancelError(null)
    const res = await fetch(`/api/client/tokens/${params.token}/cancel`, { method: 'POST' })
    if (res.ok) {
      setCancelled(true)
      setData(prev => prev ? { ...prev, status: 'cancelled' } : prev)
    } else {
      const body = await res.json()
      setCancelError(body.error === 'too_late_to_cancel'
        ? 'Annulation impossible moins de 24h avant le RDV.'
        : "Erreur lors de l'annulation.")
    }
    setCancelling(false)
  }

  return (
    <div className="min-h-screen bg-salon-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-salon-dark">Brazilian Studio Rabat</h1>
          <p className="text-sm text-salon-muted">Votre rendez-vous</p>
        </div>

        {status === 'loading' && <p className="text-center text-salon-muted text-sm">Chargement...</p>}

        {status === 'expired' && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-6 text-center space-y-3">
            <p className="text-salon-dark font-medium">Ce lien a expiré.</p>
            <p className="text-sm text-salon-muted">Contactez le salon pour obtenir un nouveau lien.</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-6 text-center">
            <p className="text-salon-muted text-sm">Lien invalide.</p>
          </div>
        )}

        {status === 'ok' && data && (
          <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-salon-dark">{data.services.name}</h2>
              <span className="text-xs bg-salon-pink/10 text-salon-pink px-2 py-0.5 rounded-full">
                {STATUS_LABELS[cancelled ? 'cancelled' : data.status] ?? data.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-salon-muted">Date</span>
                <span>{new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-salon-muted">Heure</span>
                <span>{data.start_time.slice(0, 5)}</span>
              </div>
              {data.staff?.name && (
                <div className="flex justify-between">
                  <span className="text-salon-muted">Avec</span>
                  <span>{data.staff.name}</span>
                </div>
              )}
            </div>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{cancelError}</p>
            )}

            {!cancelled && canCancel(data.status as AppointmentStatus, data.starts_at) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full text-sm text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition"
              >
                {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
              </button>
            )}

            {cancelled && (
              <p className="text-center text-sm text-green-600">Rendez-vous annulé.</p>
            )}
          </div>
        )}

        <div className="text-center">
          <Link href="/espace-client" className="text-sm text-salon-pink hover:underline">
            Accéder à mon espace client
          </Link>
        </div>
      </div>
    </div>
  )
}
