'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Download, Send, ArrowRightLeft, Copy, Trash2, RefreshCw
} from 'lucide-react'
import type { DevisWithRelations } from '@/lib/supabase/types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  rejected: 'Refusé',
  expired: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
}

export default function DevisListPage() {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/devis?${params}`)
    if (res.ok) {
      setDevis(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [search, statusFilter])  // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-salon-dark">Devis</h1>
        <Link href="/dashboard/devis/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau devis
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
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
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field text-sm w-40"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : devis.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucun devis trouvé.</p>
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
              {devis.map(d => (
                <tr key={d.id} className="border-b border-salon-rose/10 hover:bg-salon-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/devis/${d.id}`} className="font-mono text-salon-pink hover:underline">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-salon-dark">{(d.clients as any)?.name}</td>
                  <td className="px-4 py-3 text-salon-muted">
                    {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-salon-dark">
                    {d.total_ttc.toFixed(2)} MAD
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                        <Download size={15} className="text-salon-muted hover:text-salon-dark" />
                      </a>
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleSend(d.id)} title="Envoyer par email" disabled={!!actionLoading}>
                          <Send size={15} className="text-salon-muted hover:text-blue-600" />
                        </button>
                      )}
                      {['draft', 'sent'].includes(d.status) && (
                        <button onClick={() => handleConvert(d.id)} title="Convertir en facture" disabled={!!actionLoading}>
                          <ArrowRightLeft size={15} className="text-salon-muted hover:text-green-600" />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(d.id)} title="Dupliquer" disabled={!!actionLoading}>
                        <Copy size={15} className="text-salon-muted hover:text-salon-dark" />
                      </button>
                      {d.status === 'draft' && (
                        <button onClick={() => handleDelete(d.id, d.number)} title="Supprimer" disabled={!!actionLoading}>
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
