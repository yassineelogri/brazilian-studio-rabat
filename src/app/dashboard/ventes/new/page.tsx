'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, AppointmentWithRelations } from '@/lib/supabase/types'
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SaleItem {
  product: Product
  quantity: number
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '9px 12px', fontSize: '13px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
}

export default function NewVentePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [clientAppointments, setClientAppointments] = useState<AppointmentWithRelations[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [appointmentId, setAppointmentId] = useState('')
  const [soldBy, setSoldBy] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const [clients, setClients] = useState<{ id: string; name: string; phone: string }[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientId, setClientId] = useState('')

  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name').then((r: { data: Product[] | null }) => setProducts(r.data || []))
    supabase.from('appointments').select('*, clients(name, phone), services(name, color), staff(name)')
      .in('status', ['pending', 'confirmed']).order('date', { ascending: false }).limit(50)
      .then((r: { data: unknown }) => setAppointments((r.data as AppointmentWithRelations[]) || []))
    supabase.from('staff').select('id, name').eq('is_active', true).then((r: { data: { id: string; name: string }[] | null }) => setStaff(r.data || []))
    supabase.from('clients').select('id, name, phone').order('name').then((r: { data: { id: string; name: string; phone: string }[] | null }) => setClients(r.data || []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAppointmentId('')
    setClientAppointments([])
    if (!clientId) return
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    supabase
      .from('appointments')
      .select('*, clients(name, phone), services(name, color), staff(name)')
      .eq('client_id', clientId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(20)
      .then((r: { data: unknown }) => setClientAppointments((r.data as AppointmentWithRelations[]) || []))
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  const selectedClient = clients.find(c => c.id === clientId)
  const displayedAppointments = clientId ? clientAppointments : appointments

  function addItem(product: Product) {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    setSearch('')
  }

  function updateQty(productId: string, delta: number) {
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const total = items.reduce((sum, i) => sum + i.product.selling_price * i.quantity, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { setError('Ajoutez au moins un produit.'); return }
    setError('')
    setLoading(true)

    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        appointment_id: appointmentId || null,
        sold_by: soldBy || null,
        notes: notes || null,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      if (data.error === 'insufficient_stock') {
        setError(`Stock insuffisant pour ce produit (disponible: ${data.available}, demandé: ${data.requested})`)
      } else {
        setError(data.message || data.error || 'Erreur lors de l\'enregistrement.')
      }
      return
    }

    setSuccess(true)
    setItems([])
    setAppointmentId('')
    setSoldBy('')
    setNotes('')
    setClientId('')
    setClientSearch('')
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: '16px' }}>
        <CheckCircle size={48} style={{ color: '#4ADE80' }} />
        <p style={{ fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Vente enregistrée !</p>
        <button onClick={() => setSuccess(false)} style={{ background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '10px 24px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Nouvelle vente
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Ventes</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag size={22} style={{ color: '#C9A96E' }} /> Enregistrer une vente
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Product search */}
        <div>
          <label style={labelStyle}>Rechercher un produit</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom ou marque..." style={inputStyle} />
          {search && (
            <div style={{ background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '4px', maxHeight: '192px', overflowY: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <p style={{ padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucun produit trouvé</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'rgba(255,255,255,0.9)' }}>
                  <span style={{ fontWeight: 500 }}>{p.name} {p.brand && <span style={{ color: 'rgba(255,255,255,0.4)' }}>— {p.brand}</span>}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Stock: {p.stock_quantity} | {p.selling_price.toFixed(2)} DH</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>Produit</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>Prix</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>Qté</th>
                  <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ product, quantity }) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{product.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.45)' }}>{product.selling_price.toFixed(2)} DH</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => updateQty(product.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}><Minus size={12} /></button>
                        <span style={{ width: '24px', textAlign: 'center', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{quantity}</span>
                        <button type="button" onClick={() => updateQty(product.id, 1)} disabled={quantity >= product.stock_quantity}
                          style={{ background: 'none', border: 'none', cursor: quantity >= product.stock_quantity ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, opacity: quantity >= product.stock_quantity ? 0.3 : 1 }}><Plus size={12} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{(product.selling_price * quantity).toFixed(2)} DH</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeItem(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td colSpan={3} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Total</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#C9A96E', fontSize: '15px' }}>{total.toFixed(2)} DH</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Optional fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Filtrer par client (optionnel)</label>
            {selectedClient ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px' }}>
                <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{selectedClient.name} — {selectedClient.phone}</span>
                <button type="button" onClick={() => { setClientId(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginLeft: '8px' }}>✕</button>
              </div>
            ) : (
              <>
                <input type="text" placeholder="Rechercher un client..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={inputStyle} />
                {clientSearch && (
                  <div style={{ background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {filteredClients.length === 0 ? (
                      <p style={{ padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucun client trouvé</p>
                    ) : filteredClients.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setClientId(c.id); setClientSearch('') }}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
                        {c.name} — {c.phone}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label style={labelStyle}>Lier à un RDV (optionnel)</label>
            <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} style={inputStyle}>
              <option value="">— Vente indépendante —</option>
              {displayedAppointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.date} à {a.start_time?.slice(0, 5)} — {(a.clients as any)?.name} — {(a.services as any)?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Vendu par (optionnel)</label>
          <select value={soldBy} onChange={e => setSoldBy(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && <p style={{ color: '#F87171', fontSize: '13px' }}>{error}</p>}

        <button type="submit" disabled={loading || items.length === 0}
          style={{ width: '100%', background: loading || items.length === 0 ? 'rgba(201,169,110,0.3)' : 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '14px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', border: 'none', cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Enregistrement...' : `Enregistrer la vente — ${total.toFixed(2)} DH`}
        </button>
      </form>
    </div>
  )
}
