'use client'

import { useEffect, useState } from 'react'
import { BarChart2, Download } from 'lucide-react'
import { ProductSaleWithRelations } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
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

  useEffect(() => { fetchSales() }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.5)', fontWeight: 500 }}>
            Commerce
          </p>
          <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={22} style={{ color: '#C9A96E' }} /> Historique des ventes
          </h1>
        </div>
        {sales.length > 0 && (
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Exporter CSV
          </button>
        )}
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Chargement...</p>
      ) : sales.length === 0 ? (
        <div style={{
          borderRadius: '20px',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <BarChart2 size={32} style={{ color: 'rgba(201,169,110,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>Aucune vente sur cette période.</p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Produit', 'Marque', 'Qté', 'Prix unit.', 'Total', 'Marge', 'RDV', 'Vendu par'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 14px',
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                      textAlign: i >= 3 && i <= 6 ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, i) => (
                <tr key={sale.id} style={{ borderBottom: i < sales.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                    {new Date(sale.sold_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{sale.product.name}</td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{sale.product.brand || '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>{sale.quantity}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'rgba(255,255,255,0.4)' }}>{sale.unit_price.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{sale.total.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 500, color: '#4ADE80' }}>{sale.margin_total.toFixed(2)} DH</td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{sale.appointment_id ? 'Oui' : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{(sale.sold_by as any)?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Totaux</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{totalRevenue.toFixed(2)} DH</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#4ADE80' }}>{totalMargin.toFixed(2)} DH</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
