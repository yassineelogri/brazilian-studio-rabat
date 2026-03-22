'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Download, Send, ArrowRightLeft, Copy, Trash2, RefreshCw, ChevronDown
} from 'lucide-react'
import type { DevisWithRelations } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft:    { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
  sent:     { background: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  accepted: { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  rejected: { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
  expired:  { background: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
}

export default function DevisListPage() {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo)   params.set('to', dateTo)
    const res = await fetch(`/api/devis?${params}`)
    if (res.ok) setDevis(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [search, statusFilter, dateFrom, dateTo])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: MouseEvent) { if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleSend(id: string) {
    setActionLoading(id + '-send')
    const res = await fetch(`/api/devis/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error === 'no_email' ? "Ce client n'a pas d'adresse email." : "Erreur lors de l'envoi.")
    }
    setActionLoading(null)
    await load()
  }

  async function handleConvert(id: string) {
    if (!confirm('Convertir ce devis en facture ?')) return
    setActionLoading(id + '-convert')
    const res = await fetch(`/api/devis/${id}/convert`, { method: 'POST' })
    if (res.ok) {
      const facture = await res.json()
      router.push(`/dashboard/factures/${facture.id}`)
    } else {
      setError('Impossible de convertir ce devis.')
    }
    setActionLoading(null)
  }

  async function handleDuplicate(id: string) {
    setActionLoading(id + '-dup')
    const res = await fetch(`/api/devis/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const newDevis = await res.json()
      router.push(`/dashboard/devis/${newDevis.id}`)
    }
    setActionLoading(null)
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Supprimer définitivement le devis ${number} ?`)) return
    setActionLoading(id + '-del')
    await fetch(`/api/devis/${id}`, { method: 'DELETE' })
    setActionLoading(null)
    await load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Finance</p>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px' }}>Devis</h1>
        </div>
        <Link href="/dashboard/devis/new"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '12px', padding: '10px 18px', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>
          <Plus size={14} /> Nouveau devis
        </Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', marginLeft: '12px', fontSize: '16px', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '30px', width: '200px' }}
          />
        </div>
        <div ref={statusRef} style={{ position: 'relative', width: '160px' }}>
          <button type="button" onClick={() => setStatusOpen(o => !o)}
            style={{ ...inputStyle, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span>{statusFilter ? STATUS_LABELS[statusFilter] : 'Tous les statuts'}</span>
            <ChevronDown size={13} style={{ flexShrink: 0, marginLeft: '6px', color: 'rgba(255,255,255,0.4)', transform: statusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {statusOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 50 }}>
              {[['', 'Tous les statuts'], ...Object.entries(STATUS_LABELS)].map(([v, l], i, arr) => (
                <button key={v} type="button"
                  onClick={() => { setStatusFilter(v); setStatusOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: '13px', background: statusFilter === v ? 'rgba(201,169,110,0.1)' : 'none', border: 'none', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', color: statusFilter === v ? '#C9A96E' : v === '' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)', borderRadius: i === 0 ? '10px 10px 0 0' : i === arr.length - 1 ? '0 0 10px 10px' : '0' }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Du</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Au</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
      ) : devis.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Aucun devis trouvé.</p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Référence', 'Client', 'Date', 'Total TTC', 'Statut', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 14px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', textAlign: i === 3 ? 'right' : i === 4 || i === 5 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devis.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < devis.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/dashboard/devis/${d.id}`} style={{ fontFamily: 'monospace', color: '#C9A96E', textDecoration: 'none', fontSize: '13px' }}>
                      {d.number}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.85)' }}>{d.clients?.name}</td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{d.total_ttc.toFixed(2)} MAD</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, ...(STATUS_STYLES[d.status] ?? {}) }}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF" style={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
                        <Download size={14} />
                      </a>
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleSend(d.id)} title="Envoyer par email" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60A5FA', padding: 0, display: 'flex' }}>
                          <Send size={14} />
                        </button>
                      )}
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleConvert(d.id)} title="Convertir en facture" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ADE80', padding: 0, display: 'flex' }}>
                          <ArrowRightLeft size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(d.id)} title="Dupliquer" disabled={!!actionLoading}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, display: 'flex' }}>
                        <Copy size={14} />
                      </button>
                      {d.status === 'draft' && (
                        <button onClick={() => handleDelete(d.id, d.number)} title="Supprimer" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', padding: 0, display: 'flex' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
