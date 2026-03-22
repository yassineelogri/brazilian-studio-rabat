'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Send, Trash2, CheckCircle, XCircle, Edit } from 'lucide-react'
import type { FactureWithRelations, StatusEvent } from '@/lib/supabase/types'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, React.CSSProperties> = {
  draft:     { background: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
  sent:      { background: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  paid:      { background: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
  cancelled: { background: 'rgba(248,113,113,0.15)', color: '#F87171' },
}
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte', transfer: 'Virement',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', color: 'rgba(255,255,255,0.9)', padding: '9px 12px', fontSize: '13px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
}
const btnSecondary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
  padding: '7px 14px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer',
}
const th: React.CSSProperties = {
  padding: '10px 16px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
}

export default function FactureDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [facture, setFacture] = useState<FactureWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTvaRate, setEditTvaRate] = useState(20)
  const [editNotes, setEditNotes] = useState('')
  const [editItems, setEditItems] = useState<LineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [paidAmount, setPaidAmount] = useState<number>(0)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/factures/${params.id}`)
    if (res.ok) {
      const data: FactureWithRelations = await res.json()
      setFacture(data)
      setPaidAmount(data.total_ttc)
    } else {
      router.push('/dashboard/factures')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function action(path: string, method = 'POST', body?: object) {
    setActionLoading(path)
    setError(null)
    const res = await fetch(`/api/factures/${params.id}/${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? "Ce client n'a pas d'email." : `Erreur: ${b.error}`)
    }
    setActionLoading(null)
    await load()
  }

  async function handleMarkPaid() {
    setActionLoading('mark-paid')
    setError(null)
    const res = await fetch(`/api/factures/${params.id}/mark-paid`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: paymentMethod, paid_amount: paidAmount }),
    })
    if (!res.ok) { const b = await res.json(); setError(`Erreur: ${b.error}`) }
    setActionLoading(null)
    setShowMarkPaid(false)
    await load()
  }

  async function handleDelete() {
    if (!facture || !confirm(`Supprimer définitivement la facture ${facture.number} ?`)) return
    setActionLoading('delete')
    const res = await fetch(`/api/factures/${params.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/factures')
    else { setError('Impossible de supprimer cette facture.'); setActionLoading(null) }
  }

  function startEdit() {
    if (!facture) return
    setEditTvaRate(Number(facture.tva_rate))
    setEditNotes(facture.notes ?? '')
    setEditItems(facture.items.map(i => ({ id: crypto.randomUUID(), description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })))
    setIsEditing(true)
  }

  async function handleSave() {
    const validItems = editItems.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Au moins une ligne requise.'); return }
    setSaving(true)
    const res = await fetch(`/api/factures/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tva_rate: editTvaRate, notes: editNotes || null, items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) }),
    })
    if (res.ok) { setIsEditing(false); await load() }
    else { const b = await res.json(); setError(b.error || 'Erreur lors de la mise à jour.') }
    setSaving(false)
  }

  if (loading) return <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Chargement...</p>
  if (!facture) return null

  const client = facture.clients

  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
            <Link href="/dashboard/factures" style={{ color: 'rgba(201,169,110,0.7)', textDecoration: 'none' }}>Factures</Link> / {facture.number}
          </p>
          <h1 style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{facture.number}</h1>
          <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, ...(STATUS_COLORS[facture.status] ?? {}) }}>
            {STATUS_LABELS[facture.status] ?? facture.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {facture.status === 'draft' && !isEditing && (
            <button type="button" onClick={startEdit} style={btnSecondary}><Edit size={13} /> Modifier</button>
          )}
          {!isEditing && (
            <>
              <a href={`/api/factures/${facture.id}/pdf`} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none' }}><Download size={13} /> PDF</a>
              {['draft', 'sent'].includes(facture.status) && (
                <button type="button" onClick={() => action('send', 'POST', {})} disabled={!!actionLoading} style={btnSecondary}><Send size={13} /> Envoyer</button>
              )}
              {facture.status === 'sent' && !showMarkPaid && (
                <button type="button" onClick={() => { setPaidAmount(facture.total_ttc); setShowMarkPaid(true) }} disabled={!!actionLoading}
                  style={{ ...btnSecondary, color: '#4ADE80' }}><CheckCircle size={13} /> Marquer payée</button>
              )}
              {['draft', 'sent'].includes(facture.status) && (
                <button type="button" onClick={() => action('cancel', 'POST', {})} disabled={!!actionLoading}
                  style={{ ...btnSecondary, color: '#F87171' }}><XCircle size={13} /> Annuler</button>
              )}
              {facture.status === 'draft' && (
                <button type="button" onClick={handleDelete} disabled={!!actionLoading}
                  style={{ ...btnSecondary, color: '#F87171' }}><Trash2 size={13} /> Supprimer</button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#F87171', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: '16px', marginLeft: '16px' }}>&times;</button>
        </div>
      )}

      {/* Mark as Paid form */}
      {showMarkPaid && (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Enregistrer le paiement</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Mode de paiement</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'cash' | 'card' | 'transfer')} style={inputStyle}>
                <option value="cash">Espèces</option>
                <option value="card">Carte</option>
                <option value="transfer">Virement</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Montant payé (MAD)</label>
              <input type="number" min={0} step={0.01} value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={handleMarkPaid} disabled={!!actionLoading}
              style={{ background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              {actionLoading === 'mark-paid' ? 'Enregistrement...' : 'Confirmer'}
            </button>
            <button type="button" onClick={() => setShowMarkPaid(false)} disabled={!!actionLoading} style={btnSecondary}>Annuler</button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Modifier la facture</h2>
          <div>
            <label style={labelStyle}>Taux TVA (%)</label>
            <input type="number" min={0} max={100} step={0.01} value={editTvaRate} onChange={e => setEditTvaRate(Number(e.target.value))} style={inputStyle} />
          </div>
          <LineItemsBuilder key="edit" tva_rate={editTvaRate} initialItems={editItems} onChange={setEditItems} />
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={saving} style={btnSecondary}>Annuler</button>
          </div>
        </div>
      )}

      {/* Client + meta */}
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Client</p>
          <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{client?.name}</p>
          {client?.phone && <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{client.phone}</p>}
          {client?.email && <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{client.email}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Créé le</p>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(facture.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>TVA</p>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>{Number(facture.tva_rate)}%</p>
          </div>
          {facture.devis_id && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Créé depuis le devis</p>
              <Link href={`/dashboard/devis/${facture.devis_id}`} style={{ color: '#C9A96E', textDecoration: 'none', fontFamily: 'monospace', fontSize: '12px' }}>
                {facture.devis_id}
              </Link>
            </div>
          )}
          {facture.status === 'paid' && facture.paid_at && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Date de paiement</p>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(facture.paid_at).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          {facture.status === 'paid' && facture.payment_method && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Mode de paiement</p>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>{PAYMENT_METHOD_LABELS[facture.payment_method] ?? facture.payment_method}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Description</th>
              <th style={{ ...th, textAlign: 'center' }}>Qté</th>
              <th style={{ ...th, textAlign: 'right' }}>Prix HT</th>
              <th style={{ ...th, textAlign: 'right' }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {facture.items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.8)' }}>{item.description}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{Number(item.quantity)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.45)' }}>{Number(item.unit_price).toFixed(2)} MAD</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} MAD</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Sous-total HT</span>
            <span style={{ width: '112px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>{facture.subtotal_ht.toFixed(2)} MAD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>TVA ({Number(facture.tva_rate)}%)</span>
            <span style={{ width: '112px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>{facture.tva_amount.toFixed(2)} MAD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span style={{ fontWeight: 700, color: '#C9A96E' }}>Total TTC</span>
            <span style={{ width: '112px', textAlign: 'right', fontWeight: 700, color: '#C9A96E', fontSize: '15px' }}>{facture.total_ttc.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {facture.notes && (
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', fontSize: '13px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Notes</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap' }}>{facture.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>Historique du statut</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {((facture.events ?? []) as StatusEvent[]).map((ev, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
              <CheckCircle size={14} style={{ color: '#C9A96E', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>{new Date(ev.at).toLocaleString('fr-FR')}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' }}>{STATUS_LABELS[ev.status] ?? ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
