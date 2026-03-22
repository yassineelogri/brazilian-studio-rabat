'use client'

import { useEffect, useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { ProductSaleWithRelations } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '8px 12px',
  fontSize: '13px', outline: 'none',
}
const th: React.CSSProperties = {
  padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
}

export default function HistoriquePage() {
  const [sales, setSales] = useState<ProductSaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(now.toISOString().slice(0, 10))

  async function fetchSales() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales?from=${from}T00:00:00Z&to=${to}T23:59:59Z`)
      if (!res.ok) { setSales([]); setLoading(false); return }
      const json = await res.json()
      setSales(Array.isArray(json) ? json : [])
    } catch {
      setSales([])
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Ventes</p>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={22} style={{ color: '#C9A96E' }} /> Historique des ventes
          </h1>
        </div>
        {sales.length > 0 && (
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement...</p>
      ) : sales.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Aucune vente sur cette période.</p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Date</th>
                <th style={{ ...th, textAlign: 'left' }}>Produit</th>
                <th style={{ ...th, textAlign: 'left' }}>Marque</th>
                <th style={{ ...th, textAlign: 'right' }}>Qté</th>
                <th style={{ ...th, textAlign: 'right' }}>Prix unit.</th>
                <th style={{ ...th, textAlign: 'right' }}>Total</th>
                <th style={{ ...th, textAlign: 'right' }}>Marge</th>
                <th style={{ ...th, textAlign: 'left' }}>RDV</th>
                <th style={{ ...th, textAlign: 'left' }}>Vendu par</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{new Date(sale.sold_at).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{sale.product.name}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)' }}>{sale.product.brand || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>{sale.quantity}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.45)' }}>{sale.unit_price.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{sale.total.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#4ADE80' }}>{sale.margin_total.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)' }}>{sale.appointment_id ? '🔗 Oui' : '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.45)' }}>{(sale.sold_by as any)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td colSpan={5} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totaux</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#C9A96E' }}>{totalRevenue.toFixed(2)} DH</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#4ADE80' }}>{totalMargin.toFixed(2)} DH</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
