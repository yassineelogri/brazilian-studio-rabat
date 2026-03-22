'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CalendarDays, FileText, Receipt, User, ChevronLeft } from 'lucide-react'
import type { AppointmentForClient, AppointmentStatus } from '@/lib/supabase/types'
import { canCancel } from '@/lib/client-portal-utils'

export const dynamic = 'force-dynamic'

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

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
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
    setAppt(prev => prev ? { ...prev, status: 'cancelled' as AppointmentStatus } : prev)
    const res = await fetch(`/api/client/appointments/${params.id}/cancel`, { method: 'POST' })
    if (!res.ok) {
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
      <div style={{ minHeight: '100vh', background: '#141210', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
      </div>
    )
  }

  if (!appt) {
    return (
      <div style={{ minHeight: '100vh', background: '#141210', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>Rendez-vous introuvable.</p>
          <Link href="/espace-client/dashboard" style={{ fontSize: '13px', color: '#C9A96E', textDecoration: 'none' }}>
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#141210', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: '#1C1816', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Link href="/espace-client/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: '8px' }}>
            <ChevronLeft size={14} /> Retour
          </Link>
          <h1 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Rendez-vous</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Service + status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <h2 style={{ fontFamily: 'serif', fontSize: '20px', fontWeight: 400, color: 'rgba(255,255,255,0.9)' }}>{appt.services?.name}</h2>
            <span style={{ ...STATUS_STYLES[appt.status], padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
          </div>

          {/* Details */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Date</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                {new Date(appt.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Heure</span>
              <span style={{ color: '#C9A96E', fontWeight: 700, fontFamily: 'monospace', fontSize: '16px' }}>{appt.start_time.slice(0, 5)}</span>
            </div>
            {appt.staff?.name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Avec</span>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{appt.staff.name}</span>
              </div>
            )}
            {appt.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Notes</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{appt.notes}</span>
              </div>
            )}
          </div>

          {/* Cancel button */}
          {canCancel(appt.status, appt.starts_at) && (
            <button type="button" onClick={handleCancel} disabled={cancelling}
              style={{ padding: '11px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171', borderRadius: '12px', fontSize: '13px', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}>
              {cancelling ? 'Annulation...' : 'Annuler ce rendez-vous'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1C1816', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { href: '/espace-client/dashboard', label: 'Accueil', icon: CalendarDays },
          { href: '/espace-client/devis', label: 'Devis', icon: FileText },
          { href: '/espace-client/factures', label: 'Factures', icon: Receipt },
          { href: '/espace-client/profile', label: 'Profil', icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', color: 'rgba(255,255,255,0.35)' }}>
            <Icon size={18} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
