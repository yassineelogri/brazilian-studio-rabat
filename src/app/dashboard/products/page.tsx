'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/lib/supabase/types'
import { Package, Plus, AlertTriangle, Pencil, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '9px 12px', fontSize: '13px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
}
const th: React.CSSProperties = {
  padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' })
  const [error, setError] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)

  const supabase = createClient()

  async function fetchProducts() {
    const query = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!showAll) query.eq('is_active', true)
    const { data } = await query
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [showAll])

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold)
  const displayed = filterLowStock ? lowStockProducts : products

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const method = editProduct ? 'PATCH' : 'POST'
    const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        brand: form.brand || null,
        buying_price: parseFloat(form.buying_price),
        selling_price: parseFloat(form.selling_price),
        stock_quantity: parseInt(form.stock_quantity),
        low_stock_threshold: parseInt(form.low_stock_threshold),
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erreur')
      return
    }
    setShowForm(false)
    setEditProduct(null)
    setForm({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' })
    fetchProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce produit ?')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.status === 409) {
      alert('Ce produit a des ventes. Désactivez-le plutôt que de le supprimer.')
      return
    }
    fetchProducts()
  }

  async function handleToggleActive(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !product.is_active }),
    })
    fetchProducts()
  }

  function openEdit(product: Product) {
    setEditProduct(product)
    setForm({
      name: product.name,
      brand: product.brand || '',
      buying_price: String(product.buying_price),
      selling_price: String(product.selling_price),
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
    })
    setShowForm(true)
  }

  const margin = (p: Product) => p.selling_price > 0
    ? Math.round(((p.selling_price - p.buying_price) / p.selling_price) * 100)
    : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Inventaire</p>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={22} style={{ color: '#C9A96E' }} /> Produits
          </h1>
        </div>
        <button
          onClick={() => { setEditProduct(null); setForm({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' }); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <Plus size={14} /> Ajouter un produit
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', cursor: 'pointer', textAlign: 'left' }}
        >
          <AlertTriangle size={16} />
          {lowStockProducts.length} produit(s) en stock bas — {filterLowStock ? 'Voir tous' : 'Voir les produits concernés'}
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Afficher les produits désactivés
        </label>
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement...</p>
      ) : displayed.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucun produit.</p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Produit</th>
                <th style={{ ...th, textAlign: 'left' }}>Marque</th>
                <th style={{ ...th, textAlign: 'right' }}>Prix achat</th>
                <th style={{ ...th, textAlign: 'right' }}>Prix vente</th>
                <th style={{ ...th, textAlign: 'right' }}>Marge %</th>
                <th style={{ ...th, textAlign: 'right' }}>Stock</th>
                <th style={{ ...th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: product.is_active ? 1 : 0.4 }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{product.name}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)' }}>{product.brand || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.45)' }}>{product.buying_price.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{product.selling_price.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 500, color: margin(product) >= 30 ? '#4ADE80' : '#FB923C' }}>
                      {margin(product)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 500, color: product.stock_quantity <= product.low_stock_threshold ? '#F87171' : 'rgba(255,255,255,0.9)' }}>
                      {product.stock_quantity}
                      {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <button onClick={() => openEdit(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }} title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleToggleActive(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }} title={product.is_active ? 'Désactiver' : 'Activer'}>
                        {product.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }} title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit slide-over */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#1C1816', borderLeft: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '420px', height: '100%', overflowY: 'auto', padding: '24px', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}>
            {/* Header with X */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                {editProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditProduct(null) }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Marque</label>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Prix achat (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prix vente (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} required style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Stock actuel</label>
                  <input type="number" min="0" step="1" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Seuil alerte</label>
                  <input type="number" min="0" step="1" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ color: '#F87171', fontSize: '13px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  {editProduct ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditProduct(null) }}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '11px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
