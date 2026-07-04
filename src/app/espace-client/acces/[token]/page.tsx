'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { canCancel } from '@/lib/client-portal-utils'
import type { AppointmentStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

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
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:   { background: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
  confirmed: { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  cancelled: { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
  completed: { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
  no_show:   { background: 'rgba(156,163,175,0.1)',  color: '#6B7280' },
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
    <div style={{ minHeight: '100vh', background: '#221418', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #E2A7B5, #C98FA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 32px rgba(226, 167, 181,0.3)' }}>
          <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '16px', fontWeight: 700, color: '#2B1B1E' }}>BS</span>
        </div>
        <p style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '17px', color: '#E2A7B5' }}>Brazilian Studio</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Votre rendez-vous</p>
      </div>

      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {status === 'loading' && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
        )}

        {status === 'expired' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>⏰</p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: '6px' }}>Ce lien a expiré.</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Contactez le salon pour obtenir un nouveau lien.</p>
          </div>
        )}

        {status === 'not_found' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Lien invalide.</p>
          </div>
        )}

        {status === 'ok' && data && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Service + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <h2 style={{ fontFamily: 'serif', fontSize: '19px', fontWeight: 400, color: 'rgba(255,255,255,0.9)' }}>{data.services.name}</h2>
              <span style={{ ...(STATUS_STYLES[cancelled ? 'cancelled' : data.status] ?? STATUS_STYLES.completed), padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {STATUS_LABELS[cancelled ? 'cancelled' : data.status] ?? data.status}
              </span>
            </div>

            {/* Details */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Date</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {new Date(data.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Heure</span>
                <span style={{ color: '#E2A7B5', fontWeight: 700, fontFamily: 'monospace', fontSize: '16px' }}>{data.start_time.slice(0, 5)}</span>
              </div>
              {data.staff?.name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Avec</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>{data.staff.name}</span>
                </div>
              )}
            </div>

            {cancelError && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}>
                {cancelError}
              </div>
            )}

            {!cancelled && canCancel(data.status as AppointmentStatus, data.starts_at) && (
              <button type="button" onClick={handleCancel} disabled={cancelling}
                style={{ padding: '11px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171', borderRadius: '12px', fontSize: '13px', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}>
                {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
              </button>
            )}

            {cancelled && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                Rendez-vous annulé.
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link href="/espace-client" style={{ fontSize: '13px', color: '#E2A7B5', textDecoration: 'none' }}>
            Accéder à mon espace client
          </Link>
        </div>
      </div>
    </div>
  )
}
