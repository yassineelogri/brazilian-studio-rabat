'use client'

import { useEffect, useState, useCallback } from 'react'
import { Tag, Plus, Trash2, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import type { PricingCategory, PricingItem } from '@/lib/supabase/types'

type CategoryWithItems = PricingCategory & { items: PricingItem[] }

const gold = '#8E4457'
const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #FFFFFF',
  borderRadius: '16px',
  padding: '20px',
}
const input: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  borderRadius: '10px',
  color: '#382227',
  padding: '7px 11px',
  fontSize: '13px',
  outline: 'none',
}
const btnGold: React.CSSProperties = {
  background: `linear-gradient(135deg, ${gold}, #A85D70)`,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '10px',
  padding: '7px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}
const btnGhost: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  color: '#7E6469',
  borderRadius: '10px',
  padding: '7px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}
const btnRed: React.CSSProperties = {
  background: '#FBECEC',
  border: '1px solid #FBECEC',
  color: 'rgba(248,113,113,0.7)',
  borderRadius: '8px',
  padding: '5px 8px',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

export default function PricingPage() {
  const [categories, setCategories] = useState<CategoryWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      fetch('/api/pricing/categories'),
      fetch('/api/pricing/items?' + Math.random()), // cache bust
    ])
    const cats: PricingCategory[] = await catRes.json()
    // items are fetched per-category via the categories endpoint — but we load all at once
    // Actually, GET /api/pricing/categories returns categories only. Load items separately.
    const itemsAll: PricingItem[] = await itemRes.json()
    setCategories(cats.map(c => ({ ...c, items: itemsAll.filter(i => i.category_id === c.id).sort((a, b) => a.sort_order - b.sort_order) })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setSaving(true)
    const res = await fetch('/api/pricing/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), sort_order: categories.length + 1 }),
    })
    if (res.ok) {
      const cat: PricingCategory = await res.json()
      setCategories(prev => [...prev, { ...cat, items: [] }])
      setNewCatName('')
      setAddingCategory(false)
    }
    setSaving(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie et tous ses services ?')) return
    await fetch(`/api/pricing/categories/${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  function updateItem(catId: string, item: PricingItem) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, items: c.items.map(i => i.id === item.id ? item : i) } : c
    ))
  }

  function addItem(catId: string, item: PricingItem) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, items: [...c.items, item] } : c
    ))
  }

  function removeItem(catId: string, itemId: string) {
    setCategories(prev => prev.map(c =>
      c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    ))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9A8288', fontSize: '14px' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B26478', fontWeight: 500 }}>
          Gestion
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: '#382227', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Tag size={22} style={{ color: gold }} /> Tarifs & Services
        </h1>
        <p style={{ fontSize: '13px', color: '#9A8288', marginTop: '6px' }}>
          Les changements s'affichent immédiatement sur le site public.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {categories.map(cat => (
          <div key={cat.id} style={card}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed.has(cat.id) ? 0 : '16px' }}>
              <button
                onClick={() => toggleCollapse(cat.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#382227', fontSize: '15px', fontWeight: 600, padding: 0 }}
              >
                {collapsed.has(cat.id) ? <ChevronDown size={16} style={{ color: '#8A6E74' }} /> : <ChevronUp size={16} style={{ color: '#8A6E74' }} />}
                {cat.name}
                <span style={{ fontSize: '12px', color: '#B8A6AA', fontWeight: 400 }}>({cat.items.length})</span>
              </button>
              <button onClick={() => deleteCategory(cat.id)} style={btnRed} title="Supprimer catégorie">
                <Trash2 size={13} />
              </button>
            </div>

            {!collapsed.has(cat.id) && (
              <>
                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cat.items.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onUpdate={updated => updateItem(cat.id, updated)}
                      onDelete={() => removeItem(cat.id, item.id)}
                    />
                  ))}
                </div>

                {/* Add item row */}
                <AddItemRow
                  categoryId={cat.id}
                  nextOrder={cat.items.length + 1}
                  onAdd={item => addItem(cat.id, item)}
                />
              </>
            )}
          </div>
        ))}

        {/* Add category */}
        {addingCategory ? (
          <div style={{ ...card, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCategory(false) }}
              placeholder="Nom de la catégorie..."
              style={{ ...input, flex: 1 }}
            />
            <button onClick={addCategory} disabled={saving} style={btnGold}><Check size={14} /></button>
            <button onClick={() => setAddingCategory(false)} style={btnGhost}><X size={14} /></button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCategory(true)}
            style={{ ...btnGhost, justifyContent: 'center', padding: '12px', borderStyle: 'dashed', borderColor: '#E8C7CE', color: gold }}
          >
            <Plus size={16} /> Nouvelle catégorie
          </button>
        )}
      </div>
    </div>
  )
}

function ItemRow({ item, onUpdate, onDelete }: {
  item: PricingItem
  onUpdate: (updated: PricingItem) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(String(item.price))
  const [priceMax, setPriceMax] = useState(item.price_max != null ? String(item.price_max) : '')
  const [origPrice, setOrigPrice] = useState(item.original_price != null ? String(item.original_price) : '')
  const [fromPrice, setFromPrice] = useState(item.is_from_price)
  const [saving, setSaving] = useState(false)

  const isPromo = item.original_price != null && item.original_price > item.price

  async function save() {
    setSaving(true)
    const body: Record<string, unknown> = {
      name: name.trim(),
      price: Number(price),
      price_max: priceMax.trim() !== '' ? Number(priceMax) : null,
      original_price: origPrice.trim() !== '' ? Number(origPrice) : null,
      is_from_price: fromPrice,
    }
    const res = await fetch(`/api/pricing/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated: PricingItem = await res.json()
      onUpdate(updated)
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${item.name}" ?`)) return
    await fetch(`/api/pricing/items/${item.id}`, { method: 'DELETE' })
    onDelete()
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', padding: '8px', background: '#FFFFFF', borderRadius: '10px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom" style={{ ...input, flex: '2 1 140px', minWidth: '120px' }} />
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Prix min (DH)" style={{ ...input, width: '90px', flexShrink: 0 }} />
        <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Prix max (DH)" style={{ ...input, width: '100px', flexShrink: 0 }} />
        <input type="number" value={origPrice} onChange={e => setOrigPrice(e.target.value)} placeholder="Ancien prix (promo)" style={{ ...input, width: '130px', flexShrink: 0 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: '#7E6469', flexShrink: 0 }}>
          <input type="checkbox" checked={fromPrice} onChange={e => setFromPrice(e.target.checked)} style={{ accentColor: gold, width: '14px', height: '14px' }} />
          à partir de
        </label>
        <button onClick={save} disabled={saving} style={btnGold}><Check size={14} /></button>
        <button onClick={() => setEditing(false)} style={btnGhost}><X size={14} /></button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #FFFFFF' }}>
      <span style={{ fontSize: '13px', color: '#54383E', flex: 1 }}>{item.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {isPromo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', background: 'rgba(234,88,12,0.15)', color: '#FB923C', border: '1px solid rgba(234,88,12,0.25)', borderRadius: '4px', padding: '1px 6px', fontWeight: 600, letterSpacing: '0.05em' }}>PROMO</span>
            <span style={{ fontSize: '12px', color: '#9A8288', textDecoration: 'line-through' }}>{item.original_price}DH</span>
            <span style={{ fontSize: '13px', color: '#1C9950', fontWeight: 600 }}>{item.is_from_price ? 'à partir de ' : ''}{item.price}{item.price_max ? ` / ${item.price_max}` : ''}DH</span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: gold, fontWeight: 500 }}>
            {item.is_from_price && <span style={{ fontSize: '11px', color: 'rgba(226, 167, 181,0.6)', marginRight: '2px' }}>à partir de </span>}
            {item.price}{item.price_max ? ` / ${item.price_max}` : ''}DH
          </span>
        )}
        <button onClick={() => setEditing(true)} style={{ fontSize: '12px', color: gold, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Modifier</button>
        <button onClick={handleDelete} style={btnRed}><Trash2 size={12} /></button>
      </div>
    </div>
  )
}

function AddItemRow({ categoryId, nextOrder, onAdd }: {
  categoryId: string
  nextOrder: number
  onAdd: (item: PricingItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim() || !price) return
    setSaving(true)
    const res = await fetch('/api/pricing/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId, name: name.trim(), price: Number(price), sort_order: nextOrder }),
    })
    if (res.ok) {
      const item: PricingItem = await res.json()
      onAdd(item)
      setName(''); setPrice(''); setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...btnGhost, marginTop: '8px', fontSize: '12px', color: '#9A8288', justifyContent: 'center' }}>
        <Plus size={13} /> Ajouter un service
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
      <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Nom du service" style={{ ...input, flex: '2 1 140px', minWidth: '120px' }} />
      <input type="number" value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Prix (DH)" style={{ ...input, width: '100px', flexShrink: 0 }} />
      <button onClick={submit} disabled={saving} style={btnGold}><Check size={14} /></button>
      <button onClick={() => setOpen(false)} style={btnGhost}><X size={14} /></button>
    </div>
  )
}
