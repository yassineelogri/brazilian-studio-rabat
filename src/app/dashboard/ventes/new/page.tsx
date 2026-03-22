'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, AppointmentWithRelations } from '@/lib/supabase/types'
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle, ChevronDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SaleItem {
  product: Product
  quantity: number
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '6px',
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
  const [apptDropdownOpen, setApptDropdownOpen] = useState(false)
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false)
  const apptDropdownRef = useRef<HTMLDivElement>(null)
  const staffDropdownRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []))
    supabase.from('appointments').select('*, clients(name, phone), services(name, color), staff(name)')
      .in('status', ['pending', 'confirmed']).order('date', { ascending: false }).limit(50)
      .then(({ data }) => setAppointments((data as unknown as AppointmentWithRelations[]) || []))
    supabase.from('staff').select('id, name').eq('is_active', true).then(({ data }) => setStaff(data || []))
    supabase.from('clients').select('id, name, phone').order('name').then(({ data }) => setClients(data || []))
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
      .then(({ data }) => setClientAppointments((data as unknown as AppointmentWithRelations[]) || []))
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (apptDropdownRef.current && !apptDropdownRef.current.contains(e.target as Node)) setApptDropdownOpen(false)
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target as Node)) setStaffDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        <p style={{ fontSize: '18px', fontFamily: 'serif', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Vente enregistrée !</p>
        <button
          onClick={() => setSuccess(false)}
          style={{ background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '10px 24px', borderRadius: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          Nouvelle vente
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Commerce</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag size={22} style={{ color: '#C9A96E' }} /> Enregistrer une vente
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Product search */}
        <div>
          <label style={labelStyle}>Rechercher un produit</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou marque..."
            style={inputStyle}
          />
          {search && (
            <div style={{ background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <p style={{ padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucun produit trouvé</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', textAlign: 'left' }}>
                  <span style={{ fontWeight: 500 }}>{p.name} {p.brand && <span style={{ color: 'rgba(255,255,255,0.4)' }}>— {p.brand}</span>}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>Stock: {p.stock_quantity} | {p.selling_price.toFixed(2)} DH</span>
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
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Produit', 'Prix', 'Qté', 'Total', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', textAlign: i === 1 || i === 3 ? 'right' : i === 2 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(({ product, quantity }, i) => (
                  <tr key={product.id} style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{product.name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{product.selling_price.toFixed(2)} DH</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => updateQty(product.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}><Minus size={12} /></button>
                        <span style={{ width: '24px', textAlign: 'center', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{quantity}</span>
                        <button type="button" onClick={() => updateQty(product.id, 1)} disabled={quantity >= product.stock_quantity}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: quantity >= product.stock_quantity ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', padding: 0 }}><Plus size={12} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{(product.selling_price * quantity).toFixed(2)} DH</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeItem(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,0.6)', padding: 0 }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Total</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#C9A96E' }}>{total.toFixed(2)} DH</td>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{selectedClient.name} — {selectedClient.phone}</span>
                <button type="button" onClick={() => { setClientId(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: '12px', padding: 0, marginLeft: '8px' }}>✕</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  style={inputStyle}
                />
                {clientSearch && (
                  <div style={{ background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {filteredClients.length === 0 ? (
                      <p style={{ padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucun client trouvé</p>
                    ) : filteredClients.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setClientId(c.id); setClientSearch('') }}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)' }}>
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
            <div ref={apptDropdownRef} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setApptDropdownOpen(o => !o)}
                style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appointmentId
                    ? (() => { const a = displayedAppointments.find(x => x.id === appointmentId); return a ? `${a.date} à ${(a.start_time as string)?.slice(0,5)} — ${(a.clients as any)?.name}` : '—' })()
                    : '— Vente indépendante —'}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '8px', color: 'rgba(255,255,255,0.4)', transform: apptDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {apptDropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                  <button type="button" onClick={() => { setAppointmentId(''); setApptDropdownOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '13px', background: !appointmentId ? 'rgba(201,169,110,0.1)' : 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', borderRadius: '10px 10px 0 0' }}>
                    — Vente indépendante —
                  </button>
                  {displayedAppointments.map((a, i) => (
                    <button key={a.id} type="button"
                      onClick={() => { setAppointmentId(a.id); setApptDropdownOpen(false) }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '13px', background: appointmentId === a.id ? 'rgba(201,169,110,0.1)' : 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: appointmentId === a.id ? '#C9A96E' : 'rgba(255,255,255,0.85)', borderRadius: i === displayedAppointments.length - 1 ? '0 0 10px 10px' : '0' }}>
                      {a.date} à {(a.start_time as string)?.slice(0, 5)} — {(a.clients as any)?.name} — {(a.services as any)?.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Vendu par (optionnel)</label>
          <div ref={staffDropdownRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setStaffDropdownOpen(o => !o)}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
              <span>{soldBy ? staff.find(s => s.id === soldBy)?.name ?? '—' : '—'}</span>
              <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: '8px', color: 'rgba(255,255,255,0.4)', transform: staffDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {staffDropdownOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#1C1816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                <button type="button" onClick={() => { setSoldBy(''); setStaffDropdownOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '13px', background: !soldBy ? 'rgba(201,169,110,0.1)' : 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', borderRadius: '10px 10px 0 0' }}>
                  —
                </button>
                {staff.map((s, i) => (
                  <button key={s.id} type="button"
                    onClick={() => { setSoldBy(s.id); setStaffDropdownOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: '13px', background: soldBy === s.id ? 'rgba(201,169,110,0.1)' : 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: soldBy === s.id ? '#C9A96E' : 'rgba(255,255,255,0.85)', borderRadius: i === staff.length - 1 ? '0 0 10px 10px' : '0' }}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && <p style={{ color: '#F87171', fontSize: '13px' }}>{error}</p>}

        <button type="submit" disabled={loading || items.length === 0}
          style={{
            width: '100%', padding: '14px',
            background: loading || items.length === 0 ? 'rgba(201,169,110,0.3)' : 'linear-gradient(135deg, #C9A96E, #B8944F)',
            color: '#1A1410', borderRadius: '12px', fontWeight: 700, border: 'none',
            cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px',
          }}>
          {loading ? 'Enregistrement...' : `Enregistrer la vente — ${total.toFixed(2)} DH`}
        </button>
      </form>
    </div>
  )
}
