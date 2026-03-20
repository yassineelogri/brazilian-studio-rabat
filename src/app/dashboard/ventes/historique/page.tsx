'use client'

import { useEffect, useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { ProductSaleWithRelations } from '@/lib/supabase/types'

export default function HistoriquePage() {
  const [sales, setSales] = useState<ProductSaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(now.toISOString().slice(0, 10))

  async function fetchSales() {
    setLoading(true)
    const res = await fetch(`/api/sales?from=${from}T00:00:00Z&to=${to}T23:59:59Z`)
    const data = await res.json()
    setSales(data)
    setLoading(false)
  }

  useEffect(() => { fetchSales() }, [from, to])

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const totalMargin = sales.reduce((sum, s) => sum + s.margin_total, 0)

  function exportCSV() {
    const header = 'Date,Produit,Marque,Quantité,Prix unitaire,Total,Marge,RDV lié,Vendu par\n'
    const rows = sales.map(s =>
      [
        new Date(s.sold_at).toLocaleDateString('fr-FR'),
        s.product.name,
        s.product.brand || '',
        s.quantity,
        s.unit_price.toFixed(2),
        s.total.toFixed(2),
        s.margin_total.toFixed(2),
        s.appointment_id ? 'Oui' : 'Non',
        (s.sold_by as any)?.name || '',
      ].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventes_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-salon-dark flex items-center gap-2">
          <BarChart2 size={20} /> Historique des ventes
        </h1>
        {sales.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 border border-salon-rose/30 text-salon-muted px-4 py-2 rounded-lg text-sm hover:bg-salon-cream transition">
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>

      {/* Date filters */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-salon-muted mb-1">Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-salon-rose/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>
        <div>
          <label className="block text-xs text-salon-muted mb-1">Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-salon-rose/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-salon-rose/50" />
        </div>
      </div>

      {loading ? (
        <p className="text-salon-muted text-sm">Chargement...</p>
      ) : sales.length === 0 ? (
        <p className="text-salon-muted text-sm">Aucune vente sur cette période.</p>
      ) : (
        <div className="bg-white rounded-xl border border-salon-rose/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-salon-cream text-salon-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Produit</th>
                <th className="text-left px-4 py-3">Marque</th>
                <th className="text-right px-4 py-3">Qté</th>
                <th className="text-right px-4 py-3">Prix unit.</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Marge</th>
                <th className="text-left px-4 py-3">RDV</th>
                <th className="text-left px-4 py-3">Vendu par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-rose/10">
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td className="px-4 py-3 text-salon-muted whitespace-nowrap">
                    {new Date(sale.sold_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 font-medium text-salon-dark">{sale.product.name}</td>
                  <td className="px-4 py-3 text-salon-muted">{sale.product.brand || '—'}</td>
                  <td className="px-4 py-3 text-right">{sale.quantity}</td>
                  <td className="px-4 py-3 text-right text-salon-muted">{sale.unit_price.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right font-medium">{sale.total.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{sale.margin_total.toFixed(2)} DH</td>
                  <td className="px-4 py-3 text-salon-muted">{sale.appointment_id ? '🔗 Oui' : '—'}</td>
                  <td className="px-4 py-3 text-salon-muted">{(sale.sold_by as any)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-salon-cream font-semibold">
                <td colSpan={5} className="px-4 py-3 text-right text-salon-dark">Totaux</td>
                <td className="px-4 py-3 text-right text-salon-dark">{totalRevenue.toFixed(2)} DH</td>
                <td className="px-4 py-3 text-right text-green-600">{totalMargin.toFixed(2)} DH</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
