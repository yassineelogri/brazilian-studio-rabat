'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
import { Book, UserPlus, Receipt } from 'lucide-react'
import type { FactureWithRelations } from '@/lib/supabase/types'

type ClientOption = { id: string; name: string; phone: string; email: string | null }
type AppointmentOption = { id: string; date: string; start_time: string; services: string }

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '9px 12px', fontSize: '13px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
}
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px', padding: '20px',
}

export default function NewFacturePage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [walkIn, setWalkIn] = useState(false)
  const [walkInName, setWalkInName] = useState('')

  const [tvaRate, setTvaRate] = useState(20)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [appointments, setAppointments] = useState<AppointmentOption[]>([])
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [catalogProducts, setCatalogProducts] = useState<{ id: string; name: string; brand: string | null; selling_price: number }[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>()
  const savedIdRef = useRef<string | null>(null)
  const appendItemRef = useRef<((item: LineItem) => void) | null>(null)
  const latestRef = useRef({ clientId, tvaRate, notes, items, appointmentId: appointmentId as string | null })
  useEffect(() => {
    latestRef.current = { clientId, tvaRate, notes, items, appointmentId: appointmentId as string | null }
  })

  useEffect(() => {
    supabase.from('clients').select('id, name, phone, email').order('name').then((r: { data: ClientOption[] | null }) => { if (r.data) setClients(r.data) })
    supabase.from('services').select('id, name').eq('is_active', true).order('name').then((r: { data: { id: string; name: string }[] | null }) => { if (r.data) setServices(r.data) })
    supabase.from('products').select('id, name, brand, selling_price').eq('is_active', true).order('name').then((r: { data: { id: string; name: string; brand: string | null; selling_price: number }[] | null }) => { if (r.data) setCatalogProducts(r.data) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clientSearch) return
    const selected = clients.find(c => c.id === clientId)
    if (selected && !selected.name.toLowerCase().includes(clientSearch.toLowerCase()) && !selected.phone.includes(clientSearch)) {
      setClientId('')
    }
  }, [clientSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAppointmentId(null)
    setAppointments([])
    if (!clientId || walkIn) return
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const fromDate = threeMonthsAgo.toISOString().split('T')[0]
    supabase.from('appointments').select('id, date, start_time, services(name)').eq('client_id', clientId).gte('date', fromDate).order('date', { ascending: false }).limit(30)
      .then((r: { data: unknown }) => {
        if (r.data) {
          setAppointments((r.data as any[]).map(a => ({ id: a.id, date: a.date, start_time: a.start_time, services: (a.services as any)?.name || 'RDV' })))
        }
      })
  }, [clientId, walkIn]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
  )

  function handleItemsChange(newItems: LineItem[]) { setItems(newItems); triggerAutoSave() }

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

  async function resolveClientId(): Promise<string | null> {
    if (!walkIn) return clientId || null
    const name = walkInName.trim()
    if (!name) return null
    const { data, error } = await supabase.from('clients').insert({ name, phone: 'Non renseigné' }).select('id').single()
    if (error || !data) return null
    return data.id
  }

  const autoSave = useCallback(async () => {
    const { clientId, tvaRate, notes, items, appointmentId } = latestRef.current
    if (!clientId) return
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) return
    const payload = { client_id: clientId, appointment_id: appointmentId || null, tva_rate: tvaRate, notes: notes || null, items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) }
    if (savedIdRef.current) {
      await fetch(`/api/factures/${savedIdRef.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      const res = await fetch('/api/factures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { const data: FactureWithRelations = await res.json(); savedIdRef.current = data.id }
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
    if (!resolvedClientId) { setError('Impossible de créer le client.'); setSaving(false); return }
    const payload = { client_id: resolvedClientId, tva_rate: tvaRate, notes: notes || null, appointment_id: appointmentId || null, items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) }
    let res: Response
    if (savedIdRef.current) {
      res = await fetch(`/api/factures/${savedIdRef.current}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      res = await fetch('/api/factures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    if (res.ok) { const data: FactureWithRelations = await res.json(); router.push(`/dashboard/factures/${data.id}`) }
    else { const body = await res.json(); setError(body.error || 'Erreur lors de la création.'); setSaving(false) }
  }

  const selectedClient = clients.find(c => c.id === clientId)

  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Facturation</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Receipt size={22} style={{ color: '#C9A96E' }} /> Nouvelle facture
        </h1>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: '16px', marginLeft: '16px' }}>&times;</button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Client */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Client</h2>
            <button type="button"
              onClick={() => { setWalkIn(v => !v); setClientId(''); setClientSearch(''); setWalkInName(''); setAppointments([]); setAppointmentId(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
                background: walkIn ? 'rgba(201,169,110,0.15)' : 'transparent',
                border: walkIn ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(255,255,255,0.12)',
                color: walkIn ? '#C9A96E' : 'rgba(255,255,255,0.4)',
              }}>
              <UserPlus size={11} /> Client de passage
            </button>
          </div>

          {walkIn ? (
            <div>
              <label style={labelStyle}>Nom du client</label>
              <input type="text" placeholder="Ex: Fatima Zahra" value={walkInName} onChange={e => setWalkInName(e.target.value)} style={inputStyle} autoFocus />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Un profil sera créé automatiquement.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="Rechercher par nom ou téléphone..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={inputStyle} />
              {selectedClient ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{selectedClient.name} — {selectedClient.phone}</span>
                  <button type="button" onClick={() => { setClientId(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>✕</button>
                </div>
              ) : (
                <select value={clientId} onChange={e => { setClientId(e.target.value); setClientSearch(''); triggerAutoSave() }} style={inputStyle} size={Math.min(filteredClients.length + 1, 5)}>
                  <option value="">— Sélectionner —</option>
                  {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              )}
            </div>
          )}

          {clientId && !walkIn && (
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>RDV lié (optionnel)</label>
              <select value={appointmentId ?? ''} onChange={e => { setAppointmentId(e.target.value || null); triggerAutoSave() }} style={inputStyle}>
                <option value="">— Aucun RDV —</option>
                {appointments.map(a => (
                  <option key={a.id} value={a.id}>{new Date(a.date + 'T00:00:00').toLocaleDateString('fr-FR')} à {a.start_time.slice(0, 5)} — {a.services}</option>
                ))}
              </select>
              {appointments.length === 0 && clientId && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Aucun RDV dans les 3 derniers mois.</p>}
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={card}>
          <label style={labelStyle}>Taux TVA (%)</label>
          <input type="number" min={0} max={100} step={0.01} value={tvaRate} onChange={e => { setTvaRate(Number(e.target.value)); triggerAutoSave() }} style={inputStyle} />
        </div>

        {/* Line items */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Prestations / Produits</h2>
            <button type="button" onClick={() => setShowCatalog(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#C9A96E', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Book size={13} /> Catalogue
            </button>
          </div>
          {showCatalog && (
            <div style={{ background: '#1C1816', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', fontSize: '13px' }}>
              {services.length > 0 && (
                <div>
                  <p style={{ padding: '8px 14px', fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)' }}>Prestations</p>
                  {services.map(s => (
                    <button key={s.id} type="button" onClick={() => addFromCatalog(s.name, 0)}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {catalogProducts.length > 0 && (
                <div>
                  <p style={{ padding: '8px 14px', fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.03)' }}>Produits</p>
                  {catalogProducts.map(p => (
                    <button key={p.id} type="button" onClick={() => addFromCatalog(p.brand ? `${p.brand} — ${p.name}` : p.name, p.selling_price)}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{p.brand ? `${p.brand} — ${p.name}` : p.name}</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{p.selling_price.toFixed(2)} MAD</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <LineItemsBuilder tva_rate={tvaRate} onChange={handleItemsChange} appendItemRef={appendItemRef} />
        </div>

        {/* Notes */}
        <div style={card}>
          <label style={labelStyle}>Notes (optionnel)</label>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); triggerAutoSave() }} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Informations complémentaires..." />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={saving}
            style={{ background: saving ? 'rgba(201,169,110,0.4)' : 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Enregistrement...' : 'Créer la facture'}
          </button>
          <button type="button" onClick={() => router.back()}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
