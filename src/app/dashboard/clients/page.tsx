'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, Plus, Search, Check, X, Trash2, ChevronDown, ChevronUp, Phone, Mail, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
}

interface ClientHistory {
  appointments: { id: string; date: string; start_time: string; service: string; status: string }[]
  factures: { id: string; number: string; total_ttc: number; status: string; created_at: string }[]
}

const supabase = createClient()

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  color: 'rgba(255,255,255,0.9)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
}
const lbl: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '5px',
  display: 'block',
}
const btnGold: React.CSSProperties = {
  background: 'linear-gradient(135deg, #C9A96E, #B8944F)',
  color: '#1A1410',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}
const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: 'rgba(255,255,255,0.5)',
  borderRadius: '10px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#FBBF24',
  confirmed: '#60A5FA',
  completed: '#4ADE80',
  cancelled: '#F87171',
  no_show:   '#9CA3AF',
  draft:     '#9CA3AF',
  sent:      '#60A5FA',
  paid:      '#4ADE80',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingNew, setAddingNew] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, ClientHistory>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data ?? [])
    setLoading(false)
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (history[id]) return
    setHistoryLoading(id)
    const [apptRes, factRes] = await Promise.all([
      supabase.from('appointments').select('id, date, start_time, status, services(name)').eq('client_id', id).order('date', { ascending: false }).limit(10),
      supabase.from('factures').select('id, number, status, created_at, facture_items(quantity, unit_price)').eq('client_id', id).order('created_at', { ascending: false }).limit(10),
    ])
    const appointments = ((apptRes.data ?? []) as any[]).map(a => ({
      id: a.id,
      date: a.date,
      start_time: a.start_time,
      service: a.services?.name ?? 'Service',
      status: a.status,
    }))
    const factures = ((factRes.data ?? []) as any[]).map(f => {
      const items: any[] = f.facture_items ?? []
      const subtotal = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0)
      return { id: f.id, number: f.number, status: f.status, created_at: f.created_at, total_ttc: subtotal * 1.2 }
    })
    setHistory(prev => ({ ...prev, [id]: { appointments, factures } }))
    setHistoryLoading(null)
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.5)', fontWeight: 500 }}>Gestion</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} style={{ color: '#C9A96E' }} /> Clients
        </h1>
      </div>

      {/* Search + Add */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone ou email..."
            style={{ ...inp, paddingLeft: '32px' }}
          />
        </div>
        <button onClick={() => setAddingNew(true)} style={btnGold}>
          <Plus size={14} /> Nouveau client
        </button>
      </div>

      {/* Add new form */}
      {addingNew && (
        <AddClientForm
          onSave={async (name, phone, email) => {
            const { data } = await supabase.from('clients').insert({ name, phone, email: email || null }).select().single()
            if (data) { setClients(prev => [data as Client, ...prev].sort((a, b) => a.name.localeCompare(b.name))) }
            setAddingNew(false)
          }}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {/* Client count */}
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
        {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        {search ? ` trouvé${filtered.length !== 1 ? 's' : ''}` : ' au total'}
      </p>

      {/* List */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Chargement...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(client => (
            <ClientRow
              key={client.id}
              client={client}
              expanded={expandedId === client.id}
              editing={editingId === client.id}
              historyData={history[client.id]}
              historyLoading={historyLoading === client.id}
              onToggle={() => toggleExpand(client.id)}
              onStartEdit={() => setEditingId(client.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={async (name, phone, email) => {
                await supabase.from('clients').update({ name, phone, email: email || null }).eq('id', client.id)
                setClients(prev => prev.map(c => c.id === client.id ? { ...c, name, phone, email: email || null } : c))
                setEditingId(null)
              }}
              onDelete={async () => {
                if (!confirm(`Supprimer ${client.name} ? Cette action est irréversible.`)) return
                const { error } = await supabase.from('clients').delete().eq('id', client.id)
                if (error) { alert('Impossible de supprimer ce client (des données y sont liées).'); return }
                setClients(prev => prev.filter(c => c.id !== client.id))
                if (expandedId === client.id) setExpandedId(null)
              }}
            />
          ))}
          {filtered.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px', padding: '40px 0' }}>
              {search ? 'Aucun client trouvé.' : 'Aucun client pour le moment.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function AddClientForm({ onSave, onCancel }: { onSave: (n: string, p: string, e: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#C9A96E', marginBottom: '14px', letterSpacing: '0.05em' }}>Nouveau client</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={lbl}>Nom *</label>
          <input ref={ref} value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" style={inp} onKeyDown={e => e.key === 'Enter' && name && phone && onSave(name, phone, email)} />
        </div>
        <div>
          <label style={lbl}>Téléphone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0661 000 000" style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={lbl}>Email (optionnel)</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" style={inp} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => name && phone && onSave(name, phone, email)} disabled={!name || !phone} style={{ ...btnGold, opacity: (!name || !phone) ? 0.5 : 1 }}>
          <Check size={13} /> Enregistrer
        </button>
        <button onClick={onCancel} style={btnGhost}><X size={13} /> Annuler</button>
      </div>
    </div>
  )
}

function ClientRow({ client, expanded, editing, historyData, historyLoading, onToggle, onStartEdit, onCancelEdit, onSave, onDelete }: {
  client: Client
  expanded: boolean
  editing: boolean
  historyData?: ClientHistory
  historyLoading: boolean
  onToggle: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (name: string, phone: string, email: string) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone)
  const [email, setEmail] = useState(client.email ?? '')

  useEffect(() => {
    if (editing) { setName(client.name); setPhone(client.phone); setEmail(client.email ?? '') }
  }, [editing, client])

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '12px' }}>
        {/* Avatar */}
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.08))', border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#C9A96E' }}>{client.name.charAt(0).toUpperCase()}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={10} /> {client.phone}
            </span>
            {client.email && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={10} /> {client.email}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!editing && (
            <button onClick={onStartEdit} style={{ fontSize: '12px', color: '#C9A96E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              Modifier
            </button>
          )}
          <button onClick={onToggle} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <Calendar size={12} />
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Nom *</label>
                <input value={name} onChange={e => setName(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Téléphone *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => name && phone && onSave(name, phone, email)} disabled={!name || !phone} style={{ ...btnGold, opacity: (!name || !phone) ? 0.5 : 1 }}>
                  <Check size={13} /> Enregistrer
                </button>
                <button onClick={onCancelEdit} style={btnGhost}><X size={13} /> Annuler</button>
              </div>
              <button onClick={onDelete} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: 'rgba(248,113,113,0.7)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={12} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History panel */}
      {expanded && !editing && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)', padding: '16px' }}>
          {historyLoading ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '8px 0' }}>Chargement...</p>
          ) : historyData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* RDVs */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', marginBottom: '10px' }}>
                  Rendez-vous ({historyData.appointments.length})
                </p>
                {historyData.appointments.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Aucun RDV</p>
                ) : historyData.appointments.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.75)' }}>{a.service}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                        {new Date(a.date + 'T00:00:00').toLocaleDateString('fr-FR')} à {a.start_time.slice(0, 5)}
                      </p>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${STATUS_COLORS[a.status] ?? '#9CA3AF'}20`, color: STATUS_COLORS[a.status] ?? '#9CA3AF', fontWeight: 600 }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
              {/* Factures */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', marginBottom: '10px' }}>
                  Factures ({historyData.factures.length})
                </p>
                {historyData.factures.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Aucune facture</p>
                ) : historyData.factures.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>{f.number}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                        {new Date(f.created_at).toLocaleDateString('fr-FR')} — {f.total_ttc.toFixed(0)} MAD
                      </p>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: `${STATUS_COLORS[f.status] ?? '#9CA3AF'}20`, color: STATUS_COLORS[f.status] ?? '#9CA3AF', fontWeight: 600 }}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
