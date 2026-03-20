'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product, AppointmentWithRelations } from '@/lib/supabase/types'
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle } from 'lucide-react'

interface SaleItem {
  product: Product
  quantity: number
}

export default function NewVentePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [appointmentId, setAppointmentId] = useState('')
  const [soldBy, setSoldBy] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []))
    supabase.from('appointments').select('*, clients(name, phone), services(name, color), staff(name)')
      .in('status', ['pending', 'confirmed']).order('date', { ascending: false }).limit(50)
      .then(({ data }) => setAppointments((data as unknown as AppointmentWithRelations[]) || []))
    supabase.from('staff').select('id, name').eq('is_active', true).then(({ data }) => setStaff(data || []))
  }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  )

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
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle size={48} className="text-green-500" />
        <p className="text-lg font-medium text-salon-dark">Vente enregistrée !</p>
        <button onClick={() => setSuccess(false)} className="bg-salon-gold text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
          Nouvelle vente
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2 mb-6">
        <ShoppingBag size={20} /> Enregistrer une vente
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product search */}
        <div>
          <label className="block text-sm font-medium text-salon-dark mb-2">Rechercher un produit</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou marque..."
            className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50"
          />
          {search && (
            <div className="border border-salon-rose/20 rounded-lg mt-1 bg-white shadow-sm max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-2 text-sm text-salon-muted">Aucun produit trouvé</p>
              ) : filteredProducts.map(p => (
                <button key={p.id} type="button" onClick={() => addItem(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-salon-cream text-left transition">
                  <span className="font-medium">{p.name} {p.brand && <span className="text-salon-muted">— {p.brand}</span>}</span>
                  <span className="text-salon-muted">Stock: {p.stock_quantity} | {p.selling_price.toFixed(2)} DH</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Produit</th>
                  <th className="text-right px-4 py-3">Prix</th>
                  <th className="text-center px-4 py-3">Qté</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-salon-rose/10">
                {items.map(({ product, quantity }) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 font-medium text-salon-dark">{product.name}</td>
                    <td className="px-4 py-3 text-right text-salon-muted">{product.selling_price.toFixed(2)} DH</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => updateQty(product.id, -1)} className="text-salon-muted hover:text-salon-dark"><Minus size={12} /></button>
                        <span className="w-6 text-center font-medium">{quantity}</span>
                        <button type="button" onClick={() => updateQty(product.id, 1)} disabled={quantity >= product.stock_quantity}
                          className="text-salon-muted hover:text-salon-dark disabled:opacity-30"><Plus size={12} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{(product.selling_price * quantity).toFixed(2)} DH</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => removeItem(product.id)} className="text-salon-muted hover:text-red-500 transition"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-salon-cream">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-salon-dark">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-salon-dark">{total.toFixed(2)} DH</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-salon-dark mb-1">Lier à un RDV (optionnel)</label>
            <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)}
              className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50">
              <option value="">— Vente indépendante —</option>
              {appointments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.date} {a.start_time} — {(a.clients as any)?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-salon-dark mb-1">Vendu par (optionnel)</label>
            <select value={soldBy} onChange={e => setSoldBy(e.target.value)}
              className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-salon-dark mb-1">Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading || items.length === 0}
          className="w-full bg-salon-gold text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50">
          {loading ? 'Enregistrement...' : `Enregistrer la vente — ${total.toFixed(2)} DH`}
        </button>
      </form>
    </div>
  )
}
