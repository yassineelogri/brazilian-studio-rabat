'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, Send, ArrowRightLeft, Copy, Trash2, CheckCircle, XCircle, Edit } from 'lucide-react'
import type { DevisWithRelations, StatusEvent } from '@/lib/supabase/types'
import { LineItemsBuilder, LineItem } from '@/components/dashboard/LineItemsBuilder'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft:    { background: '#EFEBEA', color: '#6B7280' },
  sent:     { background: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
  accepted: { background: '#E7F6EC',  color: '#1C9950' },
  rejected: { background: '#FBECEC', color: '#C94F4F' },
  expired:  { background: '#FBF2DC',  color: '#B07818' },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  borderRadius: '10px',
  color: '#382227',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#8A6E74',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '6px',
}

const btnGlass: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  color: '#54383E',
  borderRadius: '10px', padding: '8px 14px',
  fontSize: '13px', cursor: 'pointer',
}

export default function DevisDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [devis, setDevis] = useState<DevisWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTvaRate, setEditTvaRate] = useState(20)
  const [editValidUntil, setEditValidUntil] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editItems, setEditItems] = useState<LineItem[]>([])
  const [editClientName, setEditClientName] = useState('')
  const [editClientPhone, setEditClientPhone] = useState('')
  const [editClientEmail, setEditClientEmail] = useState('')
  const [editRdvDate, setEditRdvDate] = useState('')
  const [editAvanceAmount, setEditAvanceAmount] = useState('')
  const [editAvancePaid, setEditAvancePaid] = useState(false)
  const [editPaymentMode, setEditPaymentMode] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/devis/${params.id}`)
    if (res.ok) setDevis(await res.json())
    else router.push('/dashboard/devis')
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])  // eslint-disable-line react-hooks/exhaustive-deps

  async function action(path: string, method = 'POST', body?: object) {
    setActionLoading(path)
    setError(null)
    const res = await fetch(`/api/devis/${params.id}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const b = await res.json()
      setError(b.error === 'no_email' ? "Ce client n'a pas d'email." : `Erreur: ${b.error}`)
    }
    setActionLoading(null)
    await load()
  }

  async function handleConvert() {
    if (!confirm('Convertir ce devis en facture ?')) return
    setActionLoading('convert')
    const res = await fetch(`/api/devis/${params.id}/convert`, { method: 'POST' })
    if (res.ok) {
      const facture = await res.json()
      router.push(`/dashboard/factures/${facture.id}`)
    } else {
      const b = await res.json()
      setError(`Erreur: ${b.error}`)
      setActionLoading(null)
    }
  }

  async function handleDuplicate() {
    setActionLoading('duplicate')
    const res = await fetch(`/api/devis/${params.id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      router.push(`/dashboard/devis/${d.id}`)
    }
    setActionLoading(null)
  }

  async function handleDelete() {
    if (!devis || !confirm(`Supprimer définitivement le devis ${devis.number} ?`)) return
    setActionLoading('delete')
    const res = await fetch(`/api/devis/${params.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/dashboard/devis')
    } else {
      setError('Impossible de supprimer ce devis.')
      setActionLoading(null)
    }
  }

  function startEdit() {
    if (!devis) return
    setEditTvaRate(Number(devis.tva_rate))
    setEditValidUntil(devis.valid_until ?? '')
    setEditNotes(devis.notes ?? '')
    setEditClientName(devis.clients?.name ?? '')
    setEditClientPhone(devis.clients?.phone ?? '')
    setEditClientEmail(devis.clients?.email ?? '')
    setEditRdvDate((devis as any).rdv_date ?? '')
    setEditAvanceAmount((devis as any).avance_amount != null ? String((devis as any).avance_amount) : '')
    setEditAvancePaid(Boolean((devis as any).avance_paid))
    setEditPaymentMode((devis as any).payment_mode ?? '')
    setEditItems(devis.items.map(i => ({
      id: crypto.randomUUID(),
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })))
    setIsEditing(true)
  }

  async function handleSave() {
    const validItems = editItems.filter(i => i.description.trim() && i.quantity > 0)
    if (validItems.length === 0) { setError('Au moins une ligne requise.'); return }
    if (!editClientName.trim()) { setError('Le nom du client est requis.'); return }
    setSaving(true)
    // Update client info
    const supabase = createClient()
    await supabase.from('clients').update({
      name: editClientName.trim(),
      phone: editClientPhone.trim() || 'Non renseigné',
      email: editClientEmail.trim() || null,
    }).eq('id', devis!.client_id)
    // Update devis
    const res = await fetch(`/api/devis/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tva_rate: editTvaRate,
        valid_until: editValidUntil || null,
        notes: editNotes || null,
        rdv_date: editRdvDate || null,
        avance_amount: editAvanceAmount ? Number(editAvanceAmount) : null,
        avance_paid: editAvancePaid,
        payment_mode: editPaymentMode || null,
        items: validItems.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      }),
    })
    if (res.ok) {
      setIsEditing(false)
      await load()
    } else {
      const b = await res.json()
      setError(b.error || 'Erreur lors de la mise à jour.')
    }
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#9A8288', fontSize: '14px' }}>Chargement...</p>
  if (!devis) return null

  const client = devis.clients

  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#9A8288', marginBottom: '4px' }}>
            <Link href="/dashboard/devis" style={{ color: 'rgba(226, 167, 181,0.7)', textDecoration: 'none' }}>Devis</Link>
            {' / '}
            <span style={{ fontFamily: 'monospace' }}>{devis.number}</span>
          </p>
          <h1 style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 600, color: '#382227' }}>{devis.number}</h1>
          <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, ...(STATUS_STYLES[devis.status] ?? {}) }}>
            {STATUS_LABELS[devis.status] ?? devis.status}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {devis.status === 'draft' && !isEditing && (
            <button type="button" onClick={startEdit} style={btnGlass}>
              <Edit size={13} /> Modifier
            </button>
          )}
          {!isEditing && (
            <>
              <a href={`/api/devis/${devis.id}/pdf`} target="_blank" rel="noreferrer" style={{ ...btnGlass, textDecoration: 'none' }}>
                <Download size={13} /> PDF
              </a>
              {['draft', 'sent'].includes(devis.status) && (
                <button type="button" onClick={() => action('send', 'POST', {})} disabled={!!actionLoading} style={btnGlass}>
                  <Send size={13} /> Envoyer
                </button>
              )}
              {devis.status === 'sent' && (
                <button type="button" onClick={() => action('reject')} disabled={!!actionLoading} style={{ ...btnGlass, color: '#C94F4F' }}>
                  <XCircle size={13} /> Refuser
                </button>
              )}
              {['draft', 'sent'].includes(devis.status) && (
                <button type="button" onClick={handleConvert} disabled={!!actionLoading} style={{ ...btnGlass, color: '#1C9950' }}>
                  <ArrowRightLeft size={13} /> Convertir
                </button>
              )}
              <button type="button" onClick={handleDuplicate} disabled={!!actionLoading} style={btnGlass}>
                <Copy size={13} /> Dupliquer
              </button>
              {devis.status === 'draft' && (
                <button type="button" onClick={handleDelete} disabled={!!actionLoading} style={{ ...btnGlass, color: '#C94F4F' }}>
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#F0CCCC', border: '1px solid rgba(248,113,113,0.25)', color: '#C94F4F', padding: '10px 16px', borderRadius: '12px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div style={{ background: '#FFFFFF', border: '1px solid #EEDCD7', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#432B31' }}>Modifier le devis</p>

          {/* Client */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F7E9E6', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E4457', margin: 0 }}>Client</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input value={editClientName} onChange={e => setEditClientName(e.target.value)} placeholder="Nom complet" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} placeholder="0661 000 000" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email (optionnel)</label>
              <input type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} placeholder="email@exemple.com" style={inputStyle} />
            </div>
          </div>

          {/* TVA + validity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Taux TVA (%)</label>
              <input type="number" min={0} max={100} step={0.01} value={editTvaRate} onChange={e => setEditTvaRate(Number(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valable jusqu&apos;au</label>
              <input type="date" value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* RDV + Avance + Payment mode */}
          <div style={{ background: '#FFFFFF', border: '1px solid #F7E9E6', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8E4457', margin: 0 }}>Rendez-vous &amp; Paiement</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Date de rendez-vous</label>
                <input type="date" value={editRdvDate} onChange={e => setEditRdvDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mode de paiement</label>
                <select value={editPaymentMode} onChange={e => setEditPaymentMode(e.target.value)} style={{ ...inputStyle, colorScheme: 'light' }}>
                  <option value="" style={{ background: '#FFFFFF', color: '#fff' }}>— Non spécifié —</option>
                  <option value="cash" style={{ background: '#FFFFFF', color: '#fff' }}>Espèces / Cash</option>
                  <option value="cheque" style={{ background: '#FFFFFF', color: '#fff' }}>Chèque</option>
                  <option value="card" style={{ background: '#FFFFFF', color: '#fff' }}>Carte de crédit</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Avance (MAD)</label>
                <input type="number" min={0} step={1} value={editAvanceAmount} onChange={e => setEditAvanceAmount(e.target.value)} placeholder="Ex: 500" style={inputStyle} />
              </div>
              {editAvanceAmount && (
                <div>
                  <label style={labelStyle}>Réglée ?</label>
                  <button type="button" onClick={() => setEditAvancePaid(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: editAvancePaid ? '1px solid rgba(74,222,128,0.4)' : '1px solid #EEDCD7', background: editAvancePaid ? '#E7F6EC' : '#FFFFFF', color: editAvancePaid ? '#1C9950' : '#7E6469', cursor: 'pointer', fontSize: '13px' }}>
                    {editAvancePaid ? '✓ Oui' : 'Non'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <LineItemsBuilder key="edit" tva_rate={editTvaRate} initialItems={editItems} onChange={setEditItems} />

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #A85D70, #7E4452)', color: '#FFFFFF', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '13px' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={saving} style={btnGlass}>Annuler</button>
          </div>
        </div>
      )}

      {/* Client + meta */}
      <div style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', borderRadius: '20px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
        <div>
          <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Client</p>
          <p style={{ fontWeight: 500, color: '#382227' }}>{client?.name}</p>
          {client?.phone && <p style={{ color: '#8A6E74', marginTop: '2px' }}>{client.phone}</p>}
          {client?.email && <p style={{ color: '#8A6E74', marginTop: '2px' }}>{client.email}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Date de création</p>
          <p style={{ color: '#54383E' }}>{new Date(devis.created_at).toLocaleDateString('fr-FR')}</p>
          {devis.valid_until && (
            <>
              <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Valable jusqu&apos;au</p>
              <p style={{ color: '#54383E' }}>{new Date(devis.valid_until).toLocaleDateString('fr-FR')}</p>
            </>
          )}
          {(devis as any).rdv_date && (
            <>
              <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Date de RDV</p>
              <p style={{ color: '#8E4457' }}>{new Date((devis as any).rdv_date + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
            </>
          )}
          {(devis as any).avance_amount != null && (
            <>
              <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Avance</p>
              <p style={{ color: (devis as any).avance_paid ? '#1C9950' : '#54383E' }}>
                {Number((devis as any).avance_amount).toFixed(2)} MAD — {(devis as any).avance_paid ? 'Réglée' : 'En attente'}
              </p>
            </>
          )}
          {(devis as any).payment_mode && (
            <>
              <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Mode de paiement</p>
              <p style={{ color: '#54383E' }}>{{ cash: 'Espèces / Cash', cheque: 'Chèque', card: 'Carte de crédit' }[(devis as any).payment_mode as string] ?? (devis as any).payment_mode}</p>
            </>
          )}
          <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>TVA</p>
          <p style={{ color: '#54383E' }}>{Number(devis.tva_rate)}%</p>
        </div>
      </div>

      {/* Items table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #FFFFFF' }}>
              {['Description', 'Qté', 'Prix HT', 'Total HT'].map((h, i) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9A8288', textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devis.items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: i < devis.items.length - 1 ? '1px solid #FFFFFF' : 'none' }}>
                <td style={{ padding: '12px 16px', color: '#432B31' }}>{item.description}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', color: '#54383E' }}>{Number(item.quantity)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#7E6469' }}>{Number(item.unit_price).toFixed(2)} MAD</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#432B31' }}>
                  {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #FFFFFF', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
            <span style={{ color: '#8A6E74' }}>Sous-total HT</span>
            <span style={{ width: '112px', textAlign: 'right', color: '#54383E' }}>{devis.subtotal_ht.toFixed(2)} MAD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
            <span style={{ color: '#8A6E74' }}>TVA ({Number(devis.tva_rate)}%)</span>
            <span style={{ width: '112px', textAlign: 'right', color: '#54383E' }}>{devis.tva_amount.toFixed(2)} MAD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '32px', borderTop: '1px solid #FFFFFF', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontWeight: 700, color: '#8E4457' }}>Total TTC</span>
            <span style={{ width: '112px', textAlign: 'right', fontWeight: 700, color: '#8E4457' }}>{devis.total_ttc.toFixed(2)} MAD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {devis.notes && (
        <div style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', borderRadius: '16px', padding: '20px', fontSize: '13px' }}>
          <p style={{ fontSize: '10px', color: '#9A8288', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Notes</p>
          <p style={{ color: '#54383E', whiteSpace: 'pre-wrap' }}>{devis.notes}</p>
        </div>
      )}

      {/* Status timeline */}
      <div style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', borderRadius: '16px', padding: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#54383E', marginBottom: '12px' }}>Historique du statut</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {((devis.events ?? []) as StatusEvent[]).map((ev, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <CheckCircle size={13} style={{ color: '#8E4457', flexShrink: 0 }} />
              <span style={{ color: '#9A8288' }}>{new Date(ev.at).toLocaleString('fr-FR')}</span>
              <span style={{ color: '#54383E', textTransform: 'capitalize' }}>{STATUS_LABELS[ev.status] ?? ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
