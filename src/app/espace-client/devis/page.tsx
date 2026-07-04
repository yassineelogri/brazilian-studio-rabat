'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, CalendarDays, FileText, Receipt, User, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Devis } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

type DevisRow = Pick<Devis, 'id' | 'number' | 'status' | 'tva_rate' | 'valid_until' | 'created_at'>

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft:    { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
  sent:     { background: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  accepted: { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  rejected: { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
  expired:  { background: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
}

export default function ClientDevisPage() {
  const supabase = createClient()
  const [devis, setDevis] = useState<DevisRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('devis').select('id, number, status, tva_rate, valid_until, created_at').order('created_at', { ascending: false })
        if (data) setDevis(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', background: '#221418', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: '#2A191D', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <Link href="/espace-client/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: '8px' }}>
            <ChevronLeft size={14} /> Retour
          </Link>
          <h1 style={{ fontFamily: 'serif', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Mes devis</h1>
        </div>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement...</p>
        ) : devis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <FileText size={32} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>Aucun devis.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {devis.map(d => (
              <div key={d.id} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#E2A7B5', marginBottom: '4px' }}>{d.number}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  <span style={{ ...STATUS_STYLES[d.status], padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
                <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                  <Download size={15} />
                </a>
              </div>
            ))}
          </div>
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
          <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', color: href === '/espace-client/devis' ? '#E2A7B5' : 'rgba(255,255,255,0.35)' }}>
            <Icon size={18} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
