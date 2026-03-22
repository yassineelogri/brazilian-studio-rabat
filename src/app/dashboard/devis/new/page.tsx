'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
import { Book, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ClientOption = { id: string; name: string; phone: string; email: string | null }
type AppointmentOption = { id: string; date: string; start_time: string; services: string }

export default function NewDevisPage() {
  const router = useRouter()
  const supabase = createClient()

  // Client state
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [walkIn, setWalkIn] = useState(false)
  const [walkInName, setWalkInName] = useState('')

  // Devis state
  const [tvaRate, setTvaRate] = useState(20)
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Appointment state
  const [appointments, setAppointments] = useState<AppointmentOption[]>([])
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  // Catalog state
  const [services, setServices] = useState<{ id: string; name: string; price?: number }[]>([])
  const [catalogProducts, setCatalogProducts] = useState<{ id: string; name: string; brand: string | null; selling_price: number }[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIdRef = useRef<string | null>(null)
  const appendItemRef = useRef<((item: LineItem) => void) | null>(null)
  const latestRef = useRef({ clientId, tvaRate, validUntil, notes, items, appointmentId: appointmentId as string | null })
  useEffect(() => {
    latestRef.current = { clientId, tvaRate, validUntil, notes, items, appointmentId }
  })

  // Load clients, services, products
  useEffect(() => {
    supabase.from('clients').select('id, name, phone, email').order('name').then(({ data }) => {
      if (data) setClients(data)
    })
    supabase.from('services').select('id, name, price').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setServices(data as any)
    })
    supabase.from('products').select('id, name, brand, selling_price').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setCatalogProducts(data)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset client selection when search changes and no longer matches selected client
  useEffect(() => {
    if (!clientSearch) return
    const selected = clients.find(c => c.id === clientId)
    if (selected && !selected.name.toLowerCase().includes(clientSearch.toLowerCase()) && !selected.phone.includes(clientSearch)) {
      setClientId('')
    }
  }, [clientSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load appointments when a registered client is selected — includes past appointments
  useEffect(() => {
    setAppointmentId(null)
    setAppointments([])
    if (!clientId || walkIn) return

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const fromDate = threeMonthsAgo.toISOString().split('T')[0]

    supabase
      .from('appointments')
      .select('id, date, start_time, services(name)')
      .eq('client_id', clientId)
      .gte('date', fromDate)
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          setAppointments((data as any[]).map(a => ({
            id: a.id,
            date: a.date,
            start_time: a.start_time,
            services: a.services?.name || 'RDV',
          })))
        }
      })
  }, [clientId, walkIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // When an appointment is selected, auto-add the service as a line item
  function handleAppointmentChange(id: string | null) {
    setAppointmentId(id)
    if (!id) return
    const appt = appointments.find(a => a.id === id)
    if (!appt) return

    // Check if service is already in items
    const alreadyAdded = items.some(i => i.description === appt.services)
    if (!alreadyAdded && appt.services !== 'RDV') {
      const serviceFromCatalog = services.find(s => s.name === appt.services)
      const newItem: LineItem = {
        id: crypto.randomUUID(),
        description: appt.services,
        quantity: 1,
        unit_price: 0,
      }
      appendItemRef.current?.(newItem)
    }
    triggerAutoSave()
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  function handleItemsChange(newItems: LineItem[]) {
    setItems(newItems)
    triggerAutoSave()
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(autoSave, 1000)
  }

  function addFromCatalog(description: string, price: number) {
    const newItem: LineItem = { id: crypto.randomUUID(), description, quantity: 1, unit_price: price }
    appendItemRef.current?.(newItem)
    setShowCatalog(false)
    triggerAutoSave()
  }

  // Ensure a client_id exists — creates a minimal walk-in client record if needed
  async function resolveClientId(): Promise<string | null> {
    if (!walkIn) return clientId || null
    const name = walkInName.trim()
    if (!name) return null
    // Create a minimal client record for the walk-in
    const { data, error } = await supabase
      .from('clients')
      .insert({ name, phone: 'Non renseigné' })
      .select('id')
      .single()
    if (error || !data) return null
    return data.id
  }

  const autoSave = useCallback(async () => {
    const { clientId, tvaRate, validUntil, notes, items, appointmentId } = latestRef.current
    if (!clientId) return
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) return

    const payload = {
      client_id: clientId,
      appointment_id: appointmentId || null,
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearTimeout(autoSaveRef.current)
    setError(null)

    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Ajoutez au moins une ligne.'); return }

    if (walkIn && !walkInName.trim()) { setError('Entrez le nom du client.'); return }
    if (!walkIn && !clientId) { setError('Veuillez sélectionner un client.'); return }

    setSaving(true)

    const resolvedClientId = await resolveClientId()
    if (!resolvedClientId) {
      setError('Impossible de créer le client.')
      setSaving(false)
      return
    }

    const payload = {
      client_id: resolvedClientId,
      tva_rate: tvaRate,
      valid_until: validUntil || null,
      notes: notes || null,
      appointment_id: appointmentId || null,
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

  const selectedClient = clients.find(c => c.id === clientId)

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-salon-dark">Nouveau devis</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client */}
        <div className="bg-white rounded-xl border border-salon-rose/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-salon-dark">Client</h2>
            <button
              type="button"
              onClick={() => { setWalkIn(v => !v); setClientId(''); setClientSearch(''); setWalkInName(''); setAppointments([]); setAppointmentId(null) }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                walkIn
                  ? 'bg-salon-dark text-salon-pink border-salon-dark'
                  : 'border-salon-rose/30 text-salon-muted hover:border-salon-gold hover:text-salon-gold'
              }`}
            >
              <UserPlus size={12} /> Client de passage
            </button>
          </div>

          {walkIn ? (
            <div>
              <label className="block text-xs text-salon-muted mb-1">Nom du client</label>
              <input
                type="text"
                placeholder="Ex: Fatima Zahra"
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                className="input-field w-full text-sm"
                autoFocus
              />
              <p className="text-[11px] text-salon-muted mt-1">Un profil sera créé automatiquement.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="input-field w-full text-sm"
              />
              {selectedClient ? (
                <div className="flex items-center justify-between bg-salon-cream px-3 py-2 rounded-lg text-sm">
                  <span className="font-medium text-salon-dark">{selectedClient.name} — {selectedClient.phone}</span>
                  <button type="button" onClick={() => { setClientId(''); setClientSearch('') }} className="text-salon-muted hover:text-red-500 text-xs">✕</button>
                </div>
              ) : (
                <select
                  value={clientId}
                  onChange={e => { setClientId(e.target.value); setClientSearch(''); triggerAutoSave() }}
                  className="input-field w-full text-sm"
                  size={Math.min(filteredClients.length + 1, 5)}
                >
                  <option value="">— Sélectionner —</option>
                  {filteredClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* RDV linked — only for registered clients */}
          {clientId && !walkIn && (
            <div>
              <label className="block text-xs text-salon-muted mb-1">RDV lié (optionnel)</label>
              <select
                value={appointmentId ?? ''}
                onChange={e => handleAppointmentChange(e.target.value || null)}
                className="input-field w-full text-sm"
              >
                <option value="">— Aucun RDV —</option>
                {appointments.length === 0 && (
                  <option disabled>Aucun RDV trouvé pour ce client</option>
                )}
                {appointments.map(a => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.date + 'T00:00:00').toLocaleDateString('fr-FR')} à {a.start_time.slice(0, 5)} — {a.services}
                  </option>
                ))}
              </select>
              {appointments.length === 0 && clientId && (
                <p className="text-[11px] text-salon-muted mt-1">Aucun RDV dans les 3 derniers mois.</p>
              )}
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-salon-dark">Prestations / Produits</h2>
            <button
              type="button"
              onClick={() => setShowCatalog(v => !v)}
              className="flex items-center gap-1 text-sm text-salon-pink hover:text-salon-dark"
            >
              <Book size={14} /> Catalogue
            </button>
          </div>
          {showCatalog && (
            <div className="border border-salon-rose/20 rounded-lg overflow-hidden text-sm">
              {services.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 bg-salon-cream text-xs text-salon-muted font-medium uppercase tracking-wide">Prestations</p>
                  {services.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addFromCatalog(s.name, (s as any).price ?? 0)}
                      className="w-full text-left px-3 py-2 hover:bg-salon-cream flex justify-between"
                    >
                      <span>{s.name}</span>
                      {(s as any).price ? <span className="text-salon-muted">{(s as any).price.toFixed(2)} MAD</span> : null}
                    </button>
                  ))}
                </div>
              )}
              {catalogProducts.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 bg-salon-cream text-xs text-salon-muted font-medium uppercase tracking-wide">Produits</p>
                  {catalogProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addFromCatalog(p.brand ? `${p.brand} — ${p.name}` : p.name, p.selling_price)}
                      className="w-full text-left px-3 py-2 hover:bg-salon-cream flex justify-between"
                    >
                      <span>{p.brand ? `${p.brand} — ${p.name}` : p.name}</span>
                      <span className="text-salon-muted">{p.selling_price.toFixed(2)} MAD</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <LineItemsBuilder tva_rate={tvaRate} onChange={handleItemsChange} appendItemRef={appendItemRef} />
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
