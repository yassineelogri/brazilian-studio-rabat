'use client'

import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Plus, Scissors, X, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Service } from '@/lib/supabase/types'
import { formatDurationRange, formatServicePrice, validateServiceInput } from '@/lib/services'

export const dynamic = 'force-dynamic'

type ServiceFormState = {
  name: string
  description: string
  min_duration: string
  max_duration: string
  price: string
  color: string
  is_active: boolean
}

const defaultForm: ServiceFormState = {
  name: '',
  description: '',
  min_duration: '30',
  max_duration: '60',
  price: '',
  color: '#E8B4B8',
  is_active: true,
}

const gold = '#8E4457'
const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#8A6E74',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '4px',
  display: 'block',
}
const inputStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  borderRadius: '10px',
  color: '#382227',
  padding: '8px 12px',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
}
const btnGold: React.CSSProperties = {
  padding: '8px 14px',
  background: 'linear-gradient(135deg, #A85D70, #7E4452)',
  color: '#FFFFFF',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}
const btnGhost: React.CSSProperties = {
  padding: '8px 14px',
  background: '#FFFFFF',
  border: '1px solid #EEDCD7',
  color: '#7E6469',
  borderRadius: '10px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}

function serviceToForm(service: Service): ServiceFormState {
  return {
    name: service.name,
    description: service.description ?? '',
    min_duration: String(service.min_duration),
    max_duration: String(service.max_duration),
    price: service.price != null ? String(service.price) : '',
    color: service.color,
    is_active: service.is_active,
  }
}

function formToServicePayload(form: ServiceFormState) {
  const price = form.price.trim() === '' ? null : Number(form.price)

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    min_duration: Number(form.min_duration),
    max_duration: Number(form.max_duration),
    price,
    color: form.color,
    is_active: form.is_active,
  }
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .order('is_active', { ascending: false })
      .order('name')
      .then(({ data }) => {
        setServices(data ?? [])
        setLoading(false)
      })
  }, [])

  async function createService(form: ServiceFormState) {
    const payload = formToServicePayload(form)
    const validation = validateServiceInput(payload)
    if (validation) { setError(validation); return }

    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('services')
      .insert(payload)
      .select()
      .single()

    if (insertError || !data) {
      setError(insertError?.message ?? 'Creation impossible')
    } else {
      setServices(prev => [...prev, data].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name)))
      setCreating(false)
    }
    setSaving(false)
  }

  async function updateService(id: string, form: ServiceFormState) {
    const payload = formToServicePayload(form)
    const validation = validateServiceInput(payload)
    if (validation) { setError(validation); return }

    setSaving(true)
    setError(null)
    const { data, error: updateError } = await supabase
      .from('services')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !data) {
      setError(updateError?.message ?? 'Sauvegarde impossible')
    } else {
      setServices(prev => prev.map(s => s.id === id ? data : s))
      setEditing(null)
    }
    setSaving(false)
  }

  async function deleteService(id: string) {
    if (!confirm('Etes-vous sur de vouloir supprimer cette prestation ?')) return
    setSaving(true)
    setError(null)
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setServices(prev => prev.filter(s => s.id !== id))
    }
    setSaving(false)
  }

  async function toggleActive(service: Service) {
    const next = !service.is_active
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: next } : s))
    const { error: updateError } = await supabase
      .from('services')
      .update({ is_active: next })
      .eq('id', service.id)

    if (updateError) {
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: service.is_active } : s))
      setError(updateError.message)
    }
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B26478', fontWeight: 500 }}>
          Gestion
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: '#382227', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scissors size={22} style={{ color: gold }} /> Prestations
            </h1>
            <p style={{ fontSize: '13px', color: '#9A8288', marginTop: '6px' }}>
              Les prestations actives apparaissent dans la reservation client.
            </p>
          </div>
          <button onClick={() => { setCreating(true); setEditing(null); setError(null) }} style={btnGold}>
            <Plus size={15} /> Nouvelle prestation
          </button>
        </div>
      </div>

      {error && (
        <p style={{ background: '#FBECEC', border: '1px solid #F8D2D2', color: '#9F3A3A', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {creating && (
          <div style={{ background: '#FFFFFF', border: '1px solid #F3E4DF', borderRadius: '16px', padding: '16px' }}>
            <ServiceForm
              initial={defaultForm}
              saving={saving}
              submitLabel="Ajouter"
              onSave={createService}
              onCancel={() => { setCreating(false); setError(null) }}
            />
          </div>
        )}

        {loading ? (
          <p style={{ color: '#9A8288', fontSize: '14px' }}>Chargement...</p>
        ) : services.map(service => (
          <div
            key={service.id}
            style={{
              background: '#FFFFFF',
              border: service.is_active ? '1px solid #FFFFFF' : '1px dashed #E6D6D1',
              borderRadius: '16px',
              padding: '16px',
              opacity: service.is_active ? 1 : 0.62,
            }}
          >
            {editing === service.id ? (
              <ServiceForm
                initial={serviceToForm(service)}
                saving={saving}
                submitLabel="Sauvegarder"
                onSave={form => updateService(service.id, form)}
                onCancel={() => { setEditing(null); setError(null) }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: service.color, flexShrink: 0, boxShadow: `0 0 8px ${service.color}60` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#382227' }}>{service.name}</p>
                      {!service.is_active && (
                        <span style={{ fontSize: '10px', color: '#9A8288', border: '1px solid #EEDCD7', borderRadius: '999px', padding: '2px 7px' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#9A8288', marginTop: '2px' }}>
                      {formatDurationRange(service.min_duration, service.max_duration)}
                      {formatServicePrice(service.price) ? ` · ${formatServicePrice(service.price)}` : ''}
                    </p>
                    {service.description && (
                      <p style={{ fontSize: '12px', color: '#B09BA1', marginTop: '4px', lineHeight: 1.45 }}>
                        {service.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(service)}
                    title={service.is_active ? 'Masquer de la reservation' : 'Afficher dans la reservation'}
                    style={{ ...btnGhost, padding: '8px 10px' }}
                  >
                    {service.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditing(service.id); setCreating(false); setError(null) }}
                    style={{ fontSize: '12px', color: gold, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteService(service.id)}
                    title="Supprimer"
                    style={{ ...btnGhost, padding: '8px 10px', color: '#9F3A3A', marginLeft: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ServiceForm({ initial, saving, submitLabel, onSave, onCancel }: {
  initial: ServiceFormState
  saving: boolean
  submitLabel: string
  onSave: (form: ServiceFormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ServiceFormState>(initial)

  function patch(updates: Partial<ServiceFormState>) {
    setForm(prev => ({ ...prev, ...updates }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(140px, 1fr)', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Nom</label>
          <input value={form.name} onChange={e => patch({ name: e.target.value })} placeholder="Ex: Lissage bresilien" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Prix optionnel (DH)</label>
          <input type="number" min={0} value={form.price} onChange={e => patch({ price: e.target.value })} placeholder="Ex: 450" style={inputStyle} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Description optionnelle</label>
        <input value={form.description} onChange={e => patch({ description: e.target.value })} placeholder="Note courte pour l'equipe ou les clientes" style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px minmax(120px, 1fr)', gap: '12px', alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Duree min</label>
          <input type="number" min={1} value={form.min_duration} onChange={e => patch({ min_duration: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Duree max</label>
          <input type="number" min={1} value={form.max_duration} onChange={e => patch({ max_duration: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Couleur</label>
          <input
            type="color"
            value={form.color}
            onChange={e => patch({ color: e.target.value })}
            style={{ height: '38px', width: '54px', borderRadius: '10px', cursor: 'pointer', border: '1px solid #EEDCD7', background: '#FFFFFF', padding: '2px' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#7E6469', paddingBottom: '9px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => patch({ is_active: e.target.checked })}
            style={{ width: '15px', height: '15px', accentColor: gold }}
          />
          Active en reservation
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => onSave(form)} disabled={saving} style={{ ...btnGold, opacity: saving ? 0.7 : 1 }}>
          <Check size={14} /> {saving ? 'Sauvegarde...' : submitLabel}
        </button>
        <button onClick={onCancel} style={btnGhost}>
          <X size={14} /> Annuler
        </button>
      </div>
    </div>
  )
}
