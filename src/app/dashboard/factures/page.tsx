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
const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
    const res = await fetch(`/api/factures/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error === 'no_email' ? "Ce client n'a pas d'adresse email." : "Erreur lors de l'envoi.")
    }
    setActionLoading(null)
    await load()
  }

  function openPayModal(facture: FactureWithRelations) {
    setPayModal({
      factureId: facture.id,
      totalTtc: facture.total_ttc,
      paymentMethod: 'cash',
      paidAmount: facture.total_ttc.toFixed(2),
    })
  }

  async function handleMarkPaid() {
    if (!payModal) return
    const { factureId, paymentMethod, paidAmount } = payModal
    setActionLoading(factureId + '-paid')
    const res = await fetch(`/api/factures/${factureId}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: paymentMethod,
        paid_amount: parseFloat(paidAmount),
      }),
    })
    if (!res.ok) {
      setError('Erreur lors du marquage comme payé.')
    }
    setPayModal(null)
    setActionLoading(null)
    await load()
  }

  async function handleCancel(id: string, number: string) {
    if (!confirm(`Annuler la facture ${number} ?`)) return
    setActionLoading(id + '-cancel')
    const res = await fetch(`/api/factures/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) {
      setError('Erreur lors de l\'annulation.')
    }
    setActionLoading(null)
    await load()
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Supprimer définitivement la facture ${number} ?`)) return
    setActionLoading(id + '-del')
    const res = await fetch(`/api/factures/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Erreur lors de la suppression.')
    }
    setActionLoading(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-salon-dark">Factures</h1>
        <Link href="/dashboard/factures/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouvelle facture
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Revenue summary bar */}
      {summary && !loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-salon-rose/20 rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-salon-muted mb-1 uppercase tracking-wide">Total HT</p>
            <p className="text-lg font-semibold text-salon-dark">{summary.subtotal_ht.toFixed(2)} MAD</p>
          </div>
          <div className="bg-white border border-salon-rose/20 rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-salon-muted mb-1 uppercase tracking-wide">Total TVA</p>
            <p className="text-lg font-semibold text-salon-dark">{summary.tva_amount.toFixed(2)} MAD</p>
          </div>
          <div className="bg-salon-pink/10 border border-salon-rose/30 rounded-xl px-5 py-4 text-center">
            <p className="text-xs text-salon-muted mb-1 uppercase tracking-wide">Total TTC</p>
            <p className="text-lg font-bold text-salon-pink">{summary.total_ttc.toFixed(2)} MAD</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-salon-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 w-56 text-sm"
            title="Rechercher une facture"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field text-sm w-40"
          title="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 text-sm text-salon-muted">
          <span>Du</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="input-field text-sm"
            title="Date de début"
          />
        </div>
        <div className="flex items-center gap-1 text-sm text-salon-muted">
          <span>Au</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="input-field text-sm"
            title="Date de fin"
          />
        </div>
        <button type="button" onClick={load} className="btn-secondary flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Mark as Paid modal overlay */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 space-y-4">
            <h2 className="text-base font-semibold text-salon-dark">Marquer comme payé</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="pay-method" className="block text-xs text-salon-muted mb-1">
                  Mode de paiement
                </label>
                <select
                  id="pay-method"
                  value={payModal.paymentMethod}
                  onChange={e =>
                    setPayModal(prev =>
                      prev ? { ...prev, paymentMethod: e.target.value as 'cash' | 'card' | 'transfer' } : prev
                    )
                  }
                  className="input-field text-sm w-full"
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte</option>
                  <option value="transfer">Virement</option>
                </select>
              </div>
              <div>
                <label htmlFor="pay-amount" className="block text-xs text-salon-muted mb-1">
                  Montant payé (MAD)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payModal.paidAmount}
                  onChange={e =>
                    setPayModal(prev => prev ? { ...prev, paidAmount: e.target.value } : prev)
                  }
                  className="input-field text-sm w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayModal(null)}
                className="btn-secondary text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={!!actionLoading}
                className="btn-primary text-sm"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : factures.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucune facture trouvée.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream border-b border-salon-rose/20">
              <tr>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Référence</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Client</th>
                <th className="text-left px-4 py-3 text-salon-muted font-medium">Date</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Total TTC</th>
                <th className="text-center px-4 py-3 text-salon-muted font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-salon-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(f => (
                <tr key={f.id} className="border-b border-salon-rose/10 hover:bg-salon-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/factures/${f.id}`} className="font-mono text-salon-pink hover:underline">
                      {f.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-salon-dark">{f.clients?.name}</td>
                  <td className="px-4 py-3 text-salon-muted">
                    {new Date(f.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-salon-dark">
                    {f.total_ttc.toFixed(2)} MAD
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                      {STATUS_LABELS[f.status] ?? f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* PDF download — all statuses */}
                      <a
                        href={`/api/factures/${f.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Télécharger PDF"
                      >
                        <Download size={15} className="text-salon-muted hover:text-salon-dark" />
                      </a>

                      {/* Send / Resend — draft or sent */}
                      {['draft', 'sent'].includes(f.status) && (
                        <button
                          type="button"
                          onClick={() => handleSend(f.id)}
                          title="Envoyer par email"
                          disabled={!!actionLoading}
                        >
                          <Send size={15} className="text-salon-muted hover:text-blue-600" />
                        </button>
                      )}

                      {/* Mark as Paid — sent only */}
                      {f.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => openPayModal(f)}
                          title="Marquer comme payé"
                          disabled={!!actionLoading}
                        >
                          <CreditCard size={15} className="text-salon-muted hover:text-green-600" />
                        </button>
                      )}

                      {/* Cancel — draft or sent */}
                      {['draft', 'sent'].includes(f.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(f.id, f.number)}
                          title="Annuler la facture"
                          disabled={!!actionLoading}
                        >
                          <Ban size={15} className="text-salon-muted hover:text-red-600" />
                        </button>
                      )}

                      {/* Delete — draft only */}
                      {f.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id, f.number)}
                          title="Supprimer"
                          disabled={!!actionLoading}
                        >
                          <Trash2 size={15} className="text-salon-muted hover:text-red-600" />
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
