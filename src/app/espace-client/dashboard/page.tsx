'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, LogOut, FileText, Receipt, User, CalendarDays } from 'lucide-react'
import type { AppointmentForClient, AppointmentStatus } from '@/lib/supabase/types'
import { canCancel } from '@/lib/client-portal-utils'
import LoyaltyCard from '@/components/client/LoyaltyCard'

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
    setUpcoming(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as AppointmentStatus } : a))
    const res = await fetch(`/api/client/appointments/${id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      setUpcoming(prev => prev.map(a => a.id === id ? { ...a, status: (previousStatus ?? 'confirmed') as AppointmentStatus } : a))
      const body = await res.json()
      setError(body.error === 'too_late_to_cancel' ? 'Annulation impossible moins de 24h avant le RDV.' : "Erreur lors de l'annulation.")
    }
    setCancelling(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/espace-client')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#221418', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#221418', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2B1B1E 0%, #1C1814 100%)', padding: '28px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', maxWidth: '480px', margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'rgba(226, 167, 181,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px' }}>Bonjour</p>
            <h1 style={{ fontFamily: 'serif', fontSize: '26px', fontWeight: 300, color: 'rgba(255,255,255,0.95)' }}>{clientName} ✦</h1>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Brazilian Studio Rabat</p>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Loyalty premium card */}
        <LoyaltyCard clientName={clientName} />

        {/* Book CTA */}
        <Link href="/booking" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px', background: 'linear-gradient(135deg, #E2A7B5, #C98FA0)', color: '#2B1B1E', borderRadius: '14px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginBottom: '20px', boxShadow: '0 4px 20px rgba(226, 167, 181,0.25)' }}>
          <Plus size={16} /> Prendre un nouveau rendez-vous
        </Link>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        )}

        {/* Upcoming */}
        <section style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>À venir</p>
          {upcoming.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <CalendarDays size={24} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Aucun rendez-vous à venir.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcoming.map(a => (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontFamily: 'serif', fontWeight: 400, color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>{a.services?.name}</p>
                      <p style={{ fontSize: '13px', color: '#E2A7B5', fontWeight: 500 }}>
                        {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', marginTop: '2px' }}>{a.start_time.slice(0, 5)}</p>
                      {a.staff?.name && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>avec {a.staff.name}</p>}
                    </div>
                    <span style={{ ...STATUS_STYLES[a.status], padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                    {canCancel(a.status, a.starts_at) ? (
                      <button onClick={() => handleCancel(a.id)} disabled={cancelling === a.id}
                        style={{ flex: 1, padding: '9px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                        {cancelling === a.id ? 'Annulation...' : 'Annuler'}
                      </button>
                    ) : <div style={{ flex: 1 }} />}
                    <Link href={`/espace-client/appointments/${a.id}`}
                      style={{ flex: 1, padding: '9px', background: 'rgba(226, 167, 181,0.1)', border: '1px solid rgba(226, 167, 181,0.2)', color: '#E2A7B5', borderRadius: '10px', fontSize: '13px', textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>
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
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>Passés</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {past.slice(0, 5).map(a => (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', opacity: 0.7 }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{a.services?.name}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · {a.start_time.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#2A191D', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { href: '/espace-client/dashboard', label: 'Accueil', icon: CalendarDays },
          { href: '/espace-client/devis', label: 'Devis', icon: FileText },
          { href: '/espace-client/factures', label: 'Factures', icon: Receipt },
          { href: '/espace-client/profile', label: 'Profil', icon: User },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', color: href === '/espace-client/dashboard' ? '#E2A7B5' : 'rgba(255,255,255,0.35)' }}>
            <Icon size={18} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
