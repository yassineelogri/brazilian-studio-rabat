'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
type ClientOption = { id: string; name: string; phone: string; email: string | null }

export default function NewDevisPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [tvaRate, setTvaRate] = useState(20)
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIdRef = useRef<string | null>(null)

  // Load clients
  useEffect(() => {
    supabase.from('clients').select('id, name, phone, email').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  function handleItemsChange(newItems: LineItem[], newTotals: { subtotal_ht: number; tva_amount: number; total_ttc: number }) {
    setItems(newItems)
    triggerAutoSave()
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(autoSave, 1000)
  }

  const autoSave = useCallback(async () => {
    if (!clientId) return
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) return

    const payload = {
      client_id: clientId,
      tva_rate: tvaRate,
      valid_until: validUntil || null,
      notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }

    if (savedIdRef.current) {
      await fetch(`/api/devis/${savedIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        savedIdRef.current = data.id
      }
    }
  }, [clientId, items, tvaRate, validUntil, notes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearTimeout(autoSaveRef.current)
    setError(null)

    if (!clientId) { setError('Veuillez sélectionner un client.'); return }
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Ajoutez au moins une ligne.'); return }

    setSaving(true)
    const payload = {
      client_id: clientId,
      tva_rate: tvaRate,
      valid_until: validUntil || null,
      notes: notes || null,
      items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
    }

    let res: Response
    if (savedIdRef.current) {
      res = await fetch(`/api/devis/${savedIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    if (res.ok) {
      const data = await res.json()
      router.push(`/dashboard/devis/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error || 'Erreur lors de la création.')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-salon-dark">Nouveau devis</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <h2 className="font-medium text-salon-dark">Client</h2>
          <div>
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="input-field w-full text-sm mb-2"
            />
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); triggerAutoSave() }}
              className="input-field w-full text-sm"
              size={4}
            >
              <option value="">— Sélectionner —</option>
              {filteredClients.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-salon-muted mb-1">Taux TVA (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={tvaRate}
              onChange={e => { setTvaRate(Number(e.target.value)); triggerAutoSave() }}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-salon-muted mb-1">Valable jusqu&apos;au</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => { setValidUntil(e.target.value); triggerAutoSave() }}
              className="input-field w-full text-sm"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-3">
          <h2 className="font-medium text-salon-dark">Prestations / Produits</h2>
          <LineItemsBuilder tva_rate={tvaRate} onChange={handleItemsChange} />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5">
          <label className="block text-xs text-salon-muted mb-1">Notes (optionnel)</label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); triggerAutoSave() }}
            rows={3}
            className="input-field w-full text-sm resize-none"
            placeholder="Informations complémentaires..."
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : 'Créer le devis'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
