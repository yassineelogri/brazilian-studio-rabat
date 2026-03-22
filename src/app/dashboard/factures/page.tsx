'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Download, Send, CreditCard, Ban, Trash2, RefreshCw,
} from 'lucide-react'
import type { FactureWithRelations } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft:     'Brouillon',
  sent:      'Envoyé',
  paid:      'Payé',
  cancelled: 'Annulé',
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft:     { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
  sent:      { background: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  paid:      { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  cancelled: { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
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

interface Summary {
  subtotal_ht: number
  tva_amount: number
  total_ttc: number
}

interface PayModalState {
  factureId: string
  totalTtc: number
  paymentMethod: 'cash' | 'card' | 'transfer'
  paidAmount: string
}

export default function FacturesListPage() {
  const [factures, setFactures] = useState<FactureWithRelations[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payModal, setPayModal] = useState<PayModalState | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (dateFrom)     params.set('from', dateFrom)
    if (dateTo)       params.set('to', dateTo)
    const res = await fetch(`/api/factures?${params}`)
    if (res.ok) {
      const data = await res.json()
      setFactures(data.items)
      setSummary(data.summary)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, statusFilter, dateFrom, dateTo])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(id: string) {
    setActionLoading(id + '-send')
    const res = await fetch(`/api/factures/${id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error === 'no_email' ? "Ce client n'a pas d'adresse email." : "Erreur lors de l'envoi.")
    }
    setActionLoading(null)
    await load()
  }

  function openPayModal(facture: FactureWithRelations) {
    setPayModal({ factureId: facture.id, totalTtc: facture.total_ttc, paymentMethod: 'cash', paidAmount: facture.total_ttc.toFixed(2) })
  }

  async function handleMarkPaid() {
    if (!payModal) return
    const { factureId, paymentMethod, paidAmount } = payModal
    setActionLoading(factureId + '-paid')
    const res = await fetch(`/api/factures/${factureId}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod, paid_amount: parseFloat(paidAmount) }),
    })
    if (!res.ok) setError('Erreur lors du marquage comme payé.')
    setPayModal(null)
    setActionLoading(null)
    await load()
  }

  async function handleCancel(id: string, number: string) {
    if (!confirm(`Annuler la facture ${number} ?`)) return
    setActionLoading(id + '-cancel')
    const res = await fetch(`/api/factures/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) setError('Erreur lors de l\'annulation.')
    setActionLoading(null)
    await load()
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Supprimer définitivement la facture ${number} ?`)) return
    setActionLoading(id + '-del')
    const res = await fetch(`/api/factures/${id}`, { method: 'DELETE' })
    if (!res.ok) setError('Erreur lors de la suppression.')
    setActionLoading(null)
    await load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Finance</p>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px' }}>Factures</h1>
        </div>
        <Link href="/dashboard/factures/new"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '12px', padding: '10px 18px', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>
          <Plus size={14} /> Nouvelle facture
        </Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', marginLeft: '12px', fontSize: '16px', lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Revenue summary cards */}
      {summary && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Total HT</p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{summary.subtotal_ht.toFixed(2)} MAD</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Total TVA</p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{summary.tva_amount.toFixed(2)} MAD</p>
          </div>
          <div style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: 'rgba(201,169,110,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Total TTC</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#C9A96E' }}>{summary.total_ttc.toFixed(2)} MAD</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '30px', width: '200px' }} title="Rechercher une facture" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: '160px' }} title="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Du</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} title="Date de début" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Au</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} title="Date de fin" />
        </div>
        <button type="button" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Pay modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1C1816', borderRadius: '20px', padding: '28px', width: '320px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'serif', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Marquer comme payé</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label htmlFor="pay-method" style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Mode de paiement</label>
                <select id="pay-method" value={payModal.paymentMethod}
                  onChange={e => setPayModal(prev => prev ? { ...prev, paymentMethod: e.target.value as 'cash' | 'card' | 'transfer' } : prev)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '8px 12px', fontSize: '13px', outline: 'none' }}>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte</option>
                  <option value="transfer">Virement</option>
                </select>
              </div>
              <div>
                <label htmlFor="pay-amount" style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Montant payé (MAD)</label>
                <input id="pay-amount" type="number" min="0" step="0.01" value={payModal.paidAmount}
                  onChange={e => setPayModal(prev => prev ? { ...prev, paidAmount: e.target.value } : prev)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setPayModal(null)}
                style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="button" onClick={handleMarkPaid} disabled={!!actionLoading}
                style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
      ) : factures.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Aucune facture trouvée.</p>
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
              {factures.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: i < factures.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/dashboard/factures/${f.id}`} style={{ fontFamily: 'monospace', color: '#C9A96E', textDecoration: 'none', fontSize: '13px' }}>
                      {f.number}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.85)' }}>{f.clients?.name}</td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{f.total_ttc.toFixed(2)} MAD</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, ...(STATUS_STYLES[f.status] ?? {}) }}>
                      {STATUS_LABELS[f.status] ?? f.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <a href={`/api/factures/${f.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF" style={{ color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
                        <Download size={14} />
                      </a>
                      {['draft', 'sent'].includes(f.status) && (
                        <button type="button" onClick={() => handleSend(f.id)} title="Envoyer par email" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60A5FA', padding: 0, display: 'flex' }}>
                          <Send size={14} />
                        </button>
                      )}
                      {f.status === 'sent' && (
                        <button type="button" onClick={() => openPayModal(f)} title="Marquer comme payé" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ADE80', padding: 0, display: 'flex' }}>
                          <CreditCard size={14} />
                        </button>
                      )}
                      {['draft', 'sent'].includes(f.status) && (
                        <button type="button" onClick={() => handleCancel(f.id, f.number)} title="Annuler la facture" disabled={!!actionLoading}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', padding: 0, display: 'flex' }}>
                          <Ban size={14} />
                        </button>
                      )}
                      {f.status === 'draft' && (
                        <button type="button" onClick={() => handleDelete(f.id, f.number)} title="Supprimer" disabled={!!actionLoading}
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
