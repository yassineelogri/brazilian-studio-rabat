'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/lib/supabase/types'
import { Package, Plus, AlertTriangle, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2">
          <Package size={20} /> Produits
        </h1>
        <button
          onClick={() => { setEditProduct(null); setForm({ name: '', brand: '', buying_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '3' }); setShowForm(true) }}
          className="flex items-center gap-2 bg-salon-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={14} /> Ajouter un produit
        </button>
      </div>

      {lowStockProducts.length > 0 && (
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className="w-full flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 hover:bg-red-100 transition"
        >
          <AlertTriangle size={16} />
          {lowStockProducts.length} produit(s) en stock bas — {filterLowStock ? 'Voir tous' : 'Voir les produits concernés'}
        </button>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-salon-muted flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
          Afficher les produits désactivés
        </label>
      </div>

      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : displayed.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucun produit.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-left px-4 py-3">Marque</th>
                <th className="text-right px-4 py-3">Prix achat</th>
                <th className="text-right px-4 py-3">Prix vente</th>
                <th className="text-right px-4 py-3">Marge %</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-rose/10">
              {displayed.map(product => (
                <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-salon-dark">{product.name}</td>
                  <td className="px-4 py-3 text-salon-muted">{product.brand || '—'}</td>
                  <td className="px-4 py-3 text-right text-salon-muted">{product.buying_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right font-medium text-salon-dark">{product.selling_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${margin(product) >= 30 ? 'text-green-600' : 'text-orange-500'}`}>
                      {margin(product)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${product.stock_quantity <= product.low_stock_threshold ? 'text-red-600' : 'text-salon-dark'}`}>
                      {product.stock_quantity}
                      {product.stock_quantity <= product.low_stock_threshold && ' ⚠️'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(product)} className="text-salon-muted hover:text-salon-dark transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleToggleActive(product)} className="text-salon-muted hover:text-salon-dark transition" title={product.is_active ? 'Désactiver' : 'Activer'}>
                        {product.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="text-salon-muted hover:text-red-500 transition">
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

      {/* Add/Edit form slide-over */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-salon-dark mb-6">
              {editProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-salon-dark mb-1">Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-salon-dark mb-1">Marque</label>
                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Prix achat (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => setForm(f => ({ ...f, buying_price: e.target.value }))} required
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Prix vente (DH) *</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} required
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Stock actuel</label>
                  <input type="number" min="0" step="1" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-salon-dark mb-1">Seuil alerte stock</label>
                  <input type="number" min="0" step="1" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                    className="w-full border border-salon-rose/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-salon-gold text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                  {editProduct ? 'Enregistrer' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditProduct(null) }}
                  className="flex-1 border border-salon-rose/30 text-salon-muted py-2 rounded-lg text-sm hover:bg-salon-cream transition">
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
