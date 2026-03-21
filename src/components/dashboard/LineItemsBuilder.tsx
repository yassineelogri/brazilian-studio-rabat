'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export interface LineItem {
  id: string          // client-side key only (not sent to API)
  description: string
  quantity: number
  unit_price: number
}

interface Props {
  tva_rate: number
  onChange: (items: LineItem[], totals: { subtotal_ht: number; tva_amount: number; total_ttc: number }) => void
  initialItems?: LineItem[]
}

function computeTotals(items: LineItem[], tva_rate: number) {
  const subtotal_ht = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const tva_amount  = subtotal_ht * tva_rate / 100
  const total_ttc   = subtotal_ht + tva_amount
  return {
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    tva_amount:  Math.round(tva_amount  * 100) / 100,
    total_ttc:   Math.round(total_ttc   * 100) / 100,
  }
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
}

export function LineItemsBuilder({ tva_rate, onChange, initialItems }: Props) {
  const [items, setItems] = useState<LineItem[]>(initialItems ?? [newItem()])

  useEffect(() => {
    onChange(items, computeTotals(items, tva_rate))
  }, [items, tva_rate])  // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function addItem() {
    setItems(prev => [...prev, newItem()])
  }

  function removeItem(id: string) {
    if (items.length === 1) return  // keep at least one row
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const next = [...items]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setItems(next)
  }

  const totals = computeTotals(items, tva_rate)

  return (
    <div className="space-y-2">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_110px_90px_40px] gap-2 px-2 text-xs font-medium text-salon-muted uppercase tracking-wide">
        <span>Description</span>
        <span className="text-center">Qté</span>
        <span className="text-right">Prix HT (MAD)</span>
        <span className="text-right">Total HT</span>
        <span />
      </div>

      {/* Rows */}
      {items.map((item, idx) => {
        const lineTotal = item.quantity * item.unit_price
        return (
          <div key={item.id} className="grid grid-cols-[1fr_80px_110px_90px_40px] gap-2 items-center">
            <input
              type="text"
              value={item.description}
              onChange={e => updateItem(item.id, 'description', e.target.value)}
              placeholder="Description de la prestation / produit"
              className="input-field text-sm"
            />
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={item.quantity}
              onChange={e => updateItem(item.id, 'quantity', Math.max(0.01, Number(e.target.value)))}
              className="input-field text-sm text-center"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.unit_price}
              onChange={e => updateItem(item.id, 'unit_price', Math.max(0, Number(e.target.value)))}
              className="input-field text-sm text-right"
            />
            <span className="text-sm text-right text-salon-dark font-medium pr-1">
              {lineTotal.toFixed(2)}
            </span>
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => moveItem(item.id, -1)}
                disabled={idx === 0}
                className="p-0.5 text-salon-muted hover:text-salon-dark disabled:opacity-30"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="p-0.5 text-red-400 hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveItem(item.id, 1)}
                disabled={idx === items.length - 1}
                className="p-0.5 text-salon-muted hover:text-salon-dark disabled:opacity-30"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        )
      })}

      {/* Add row */}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-sm text-salon-pink hover:text-salon-dark transition mt-1"
      >
        <Plus size={14} />
        Ajouter une ligne
      </button>

      {/* Totals preview */}
      <div className="border-t border-salon-rose/20 pt-3 mt-3 space-y-1 text-sm">
        <div className="flex justify-end gap-6">
          <span className="text-salon-muted">Sous-total HT</span>
          <span className="w-28 text-right font-medium">{totals.subtotal_ht.toFixed(2)} MAD</span>
        </div>
        <div className="flex justify-end gap-6">
          <span className="text-salon-muted">TVA ({tva_rate}%)</span>
          <span className="w-28 text-right font-medium">{totals.tva_amount.toFixed(2)} MAD</span>
        </div>
        <div className="flex justify-end gap-6 border-t border-salon-rose/20 pt-2">
          <span className="font-semibold text-salon-dark">Total TTC</span>
          <span className="w-28 text-right font-bold text-salon-pink text-base">{totals.total_ttc.toFixed(2)} MAD</span>
        </div>
      </div>
    </div>
  )
}
