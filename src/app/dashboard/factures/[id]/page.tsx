'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Send, Trash2, CheckCircle, XCircle, Edit } from 'lucide-react'
import type { FactureWithRelations, StatusEvent } from '@/lib/supabase/types'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte', transfer: 'Virement',
}

export default function FactureDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [facture, setFacture] = useState<FactureWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTvaRate, setEditTvaRate] = useState(20)
  const [editNotes, setEditNotes] = useState('')
  const [editItems, setEditItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)

  // Mark as Paid inline form state
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [paidAmount, setPaidAmount] = useState<number>(0)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/factures/${params.id}`)
    if (res.ok) {
      const data: FactureWithRelations = await res.json()
      setFacture(data)
      setPaidAmount(data.total_ttc)
    } else {
      router.push('/dashboard/factures')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function action(path: string, method = 'POST', body?: object) {
    setActionLoading(path)
    setError(null)
    const res = await fetch(`/api/factures/${params.id}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? "Ce client n'a pas d'email." : `Erreur: ${b.error}`)
    }
    setActionLoading(null)
    await load()
  }

  async function handleMarkPaid() {
    setActionLoading('mark-paid')
    setError(null)
    const res = await fetch(`/api/factures/${params.id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod, paid_amount: paidAmount }),
    })
    if (!res.ok) {
      const b = await res.json()
      setError(`Erreur: ${b.error}`)
    }
    setActionLoading(null)
    setShowMarkPaid(false)
    await load()
  }

  async function handleDelete() {
    if (!facture || !confirm(`Supprimer définitivement la facture ${facture.number} ?`)) return
    setActionLoading('delete')
    const res = await fetch(`/api/factures/${params.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/dashboard/factures')
    } else {
      setError('Impossible de supprimer cette facture.')
      setActionLoading(null)
    }
  }

  function startEdit() {
    if (!facture) return
    setEditTvaRate(Number(facture.tva_rate))
    setEditNotes(facture.notes ?? '')
    setEditItems(facture.items.map(i => ({
      id: crypto.randomUUID(),
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })))
    setIsEditing(true)
  }

  async function handleSave() {
    const validItems = editItems.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Au moins une ligne requise.'); return }
    setSaving(true)
    const res = await fetch(`/api/factures/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tva_rate: editTvaRate,
        notes: editNotes || null,
        items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      }),
    })
    if (res.ok) {
      setIsEditing(false)
      await load()
    } else {
      const b = await res.json()
      setError(b.error || 'Erreur lors de la mise à jour.')
    }
    setSaving(false)
  }

  if (loading) return <p className="text-salon-muted text-sm">Chargement...</p>
  if (!facture) return null

  const client = facture.clients

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-salon-muted mb-1">
            <Link href="/dashboard/factures" className="hover:underline">Factures</Link> / {facture.number}
          </p>
          <h1 className="text-xl font-semibold text-salon-dark font-mono">{facture.number}</h1>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[facture.status] ?? ''}`}>
            {STATUS_LABELS[facture.status] ?? facture.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap justify-end">
          {facture.status === 'draft' && !isEditing && (
            <button type="button" onClick={startEdit}
              className="btn-secondary flex items-center gap-1 text-sm">
              <Edit size={14} /> Modifier
            </button>
          )}
          {!isEditing && (
            <>
              <a href={`/api/factures/${facture.id}/pdf`} target="_blank" rel="noreferrer"
                className="btn-secondary flex items-center gap-1 text-sm">
                <Download size={14} /> PDF
              </a>
              {['draft', 'sent'].includes(facture.status) && (
                <button type="button" onClick={() => action('send', 'POST', {})}
                  disabled={!!actionLoading}
                  className="btn-secondary flex items-center gap-1 text-sm">
                  <Send size={14} /> Envoyer
                </button>
              )}
              {facture.status === 'sent' && !showMarkPaid && (
                <button type="button" onClick={() => { setPaidAmount(facture.total_ttc); setShowMarkPaid(true) }}
                  disabled={!!actionLoading}
                  className="btn-secondary flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle size={14} /> Marquer payée
                </button>
              )}
              {['draft', 'sent'].includes(facture.status) && (
                <button type="button" onClick={() => action('cancel', 'POST', {})}
                  disabled={!!actionLoading}
                  className="btn-secondary flex items-center gap-1 text-sm text-red-600">
                  <XCircle size={14} /> Annuler
                </button>
              )}
              {facture.status === 'draft' && (
                <button type="button" onClick={handleDelete} disabled={!!actionLoading}
                  className="btn-secondary flex items-center gap-1 text-sm text-red-600">
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* Mark as Paid inline form */}
      {showMarkPaid && (
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <h2 className="font-medium text-salon-dark">Enregistrer le paiement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-salon-muted mb-1">Mode de paiement</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'cash' | 'card' | 'transfer')}
                className="input-field w-full text-sm"
              >
                <option value="cash">Espèces</option>
                <option value="card">Carte</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-salon-muted mb-1">Montant payé (MAD)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={paidAmount}
                onChange={e => setPaidAmount(Number(e.target.value))}
                className="input-field w-full text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleMarkPaid} disabled={!!actionLoading} className="btn-primary text-sm">
              {actionLoading === 'mark-paid' ? 'Enregistrement...' : 'Confirmer'}
            </button>
            <button type="button" onClick={() => setShowMarkPaid(false)} disabled={!!actionLoading} className="btn-secondary text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Inline edit form */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <h2 className="font-medium text-salon-dark">Modifier la facture</h2>
          <div>
            <label className="block text-xs text-salon-muted mb-1">Taux TVA (%)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              value={editTvaRate}
              onChange={e => setEditTvaRate(Number(e.target.value))}
              className="input-field w-full text-sm"
            />
          </div>
          <LineItemsBuilder
            key="edit"
            tva_rate={editTvaRate}
            initialItems={editItems}
            onChange={(newItems) => setEditItems(newItems)}
          />
          <div>
            <label className="block text-xs text-salon-muted mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={3}
              className="input-field w-full text-sm resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="btn-secondary text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Client + meta */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-salon-muted text-xs mb-1">Client</p>
          <p className="font-medium text-salon-dark">{client?.name}</p>
          {client?.phone && <p className="text-salon-muted">{client.phone}</p>}
          {client?.email && <p className="text-salon-muted">{client.email}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-salon-muted text-xs">Date de création</p>
          <p>{new Date(facture.created_at).toLocaleDateString('fr-FR')}</p>
          <p className="text-salon-muted text-xs mt-2">TVA</p>
          <p>{Number(facture.tva_rate)}%</p>
          {facture.devis_id && (
            <>
              <p className="text-salon-muted text-xs mt-2">Créé depuis le devis</p>
              <p>
                <Link href={`/dashboard/devis/${facture.devis_id}`} className="text-salon-pink hover:underline">
                  {facture.devis_id}
                </Link>
              </p>
            </>
          )}
          {facture.status === 'paid' && facture.paid_at && (
            <>
              <p className="text-salon-muted text-xs mt-2">Date de paiement</p>
              <p>{new Date(facture.paid_at).toLocaleDateString('fr-FR')}</p>
            </>
          )}
          {facture.status === 'paid' && facture.payment_method && (
            <>
              <p className="text-salon-muted text-xs mt-2">Mode de paiement</p>
              <p>{PAYMENT_METHOD_LABELS[facture.payment_method] ?? facture.payment_method}</p>
            </>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-salon-cream border-b border-salon-rose/20">
            <tr>
              <th className="text-left px-4 py-3 text-salon-muted font-medium">Description</th>
              <th className="text-center px-4 py-3 text-salon-muted font-medium">Qté</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Prix HT</th>
              <th className="text-right px-4 py-3 text-salon-muted font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.items.map(item => (
              <tr key={item.id} className="border-b border-salon-rose/10">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-center">{Number(item.quantity)}</td>
                <td className="px-4 py-3 text-right">{Number(item.unit_price).toFixed(2)} MAD</td>
                <td className="px-4 py-3 text-right font-medium">
                  {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 space-y-1 text-sm border-t border-salon-rose/20">
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">Sous-total HT</span>
            <span className="w-28 text-right">{facture.subtotal_ht.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6">
            <span className="text-salon-muted">TVA ({Number(facture.tva_rate)}%)</span>
            <span className="w-28 text-right">{facture.tva_amount.toFixed(2)} MAD</span>
          </div>
          <div className="flex justify-end gap-6 border-t border-salon-rose/20 pt-2 font-bold text-salon-pink">
            <span>Total TTC</span>
            <span className="w-28 text-right">{facture.total_ttc.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {facture.notes && (
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 text-sm">
          <p className="text-salon-muted text-xs mb-2">Notes</p>
          <p className="text-salon-dark whitespace-pre-wrap">{facture.notes}</p>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
        <p className="text-sm font-medium text-salon-dark mb-3">Historique du statut</p>
        <div className="space-y-2">
          {((facture.events ?? []) as StatusEvent[]).map((ev, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <CheckCircle size={14} className="text-salon-pink flex-shrink-0" />
              <span className="text-salon-muted">
                {new Date(ev.at).toLocaleString('fr-FR')}
              </span>
              <span className="capitalize text-salon-dark">{STATUS_LABELS[ev.status] ?? ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
