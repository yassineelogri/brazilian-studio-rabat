'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Clock, User, Scissors, Calendar, CheckCircle2, XCircle, MinusCircle, AlertCircle } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations | null
  onClose: () => void
  onAction: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente',  color: '#B07818', bg: '#FBF2DC',  icon: <Clock size={13} /> },
  confirmed: { label: 'Confirmé',    color: '#1C9950', bg: '#E7F6EC',   icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Annulé',      color: '#6B7280', bg: '#EFEBEA',  icon: <XCircle size={13} /> },
  completed: { label: 'Terminé',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   icon: <CheckCircle2 size={13} /> },
  no_show:   { label: 'No-show',     color: '#C94F4F', bg: '#FBECEC',  icon: <AlertCircle size={13} /> },
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ marginTop: '2px', color: '#9A8288', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9A8288', marginBottom: '2px', fontWeight: 500 }}>{label}</p>
        {children}
      </div>
    </div>
  )
}

export default function AppointmentSlideOver({ appointment, onClose, onAction }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}/confirm`, { method: 'POST' })
    setLoading(false)
    onAction()
    onClose()
  }

  async function changeStatus(status: string) {
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    onAction()
    onClose()
  }

  async function deleteAppt() {
    if (!window.confirm('Supprimer ce rendez-vous ?')) return
    setLoading(true)
    await fetch(`/api/appointments/${appointment!.id}`, { method: 'DELETE' })
    setLoading(false)
    onAction()
    onClose()
  }

  const color = appointment?.services?.color ?? '#8E4457'
  const status = appointment ? (STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.pending) : null

  const dateStr = appointment
    ? new Date(appointment.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  return (
    <AnimatePresence>
      {appointment && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(56,34,39,0.12)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
              width: '340px',
              maxWidth: '90vw',
              background: '#FFFFFF',
              borderLeft: '1px solid #FFFFFF',
              boxShadow: '-8px 0 32px rgba(56,34,39,0.12)',
            }}
          >
            {/* Header */}
            <div
              style={{
                position: 'relative',
                padding: '24px 20px',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${color}15, transparent)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: `linear-gradient(180deg, ${color}, ${color}44)`,
                  boxShadow: `0 0 12px ${color}30`,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: 'serif', fontSize: '18px', color: '#382227', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                    {appointment.services?.name ?? 'Rendez-vous'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8A6E74', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {appointment.clients?.name}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    marginLeft: '12px',
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    background: '#F7E9E6',
                    border: '1px solid #FFFFFF',
                    color: '#8A6E74',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status badge */}
              {status && (
                <div style={{
                  marginTop: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: status.bg,
                  color: status.color,
                  border: `1px solid ${status.color}25`,
                }}>
                  {status.icon}
                  {status.label}
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <InfoRow icon={<User size={14} />} label="Client">
                <p style={{ fontWeight: 500, color: '#432B31', fontSize: '14px' }}>{appointment.clients?.name}</p>
                {appointment.clients?.phone && (
                  <a
                    href={`tel:${appointment.clients.phone}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8E4457', marginTop: '4px', textDecoration: 'none' }}
                  >
                    <Phone size={12} /> {appointment.clients.phone}
                  </a>
                )}
              </InfoRow>

              <InfoRow icon={<Scissors size={14} />} label="Service">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: color, boxShadow: `0 0 6px ${color}50` }} />
                  <p style={{ fontWeight: 500, color: '#432B31', fontSize: '14px' }}>{appointment.services?.name}</p>
                </div>
              </InfoRow>

              <InfoRow icon={<Calendar size={14} />} label="Date & Heure">
                <p style={{ fontWeight: 500, color: '#432B31', fontSize: '14px', textTransform: 'capitalize' }}>{dateStr}</p>
                <p style={{ fontSize: '13px', color: '#8A6E74', marginTop: '4px' }}>
                  {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: '#F7E9E6',
                    color: '#8E4457',
                    border: '1px solid #F7E9E6',
                  }}>
                    {appointment.duration_minutes} min
                  </span>
                </p>
              </InfoRow>

              <InfoRow icon={<User size={14} />} label="Staff assigné">
                {appointment.staff?.name
                  ? <p style={{ fontWeight: 500, color: '#432B31', fontSize: '14px' }}>{appointment.staff.name}</p>
                  : <p style={{ fontSize: '13px', color: '#9A8288', fontStyle: 'italic' }}>Non assigné</p>}
              </InfoRow>

              {appointment.notes && (
                <InfoRow icon={<MinusCircle size={14} />} label="Notes">
                  <p style={{
                    fontSize: '13px',
                    color: '#54383E',
                    background: '#FFFFFF',
                    padding: '12px',
                    borderRadius: '12px',
                    lineHeight: 1.6,
                    border: '1px solid #FFFFFF',
                  }}>
                    {appointment.notes}
                  </p>
                </InfoRow>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid #FFFFFF', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {appointment.status === 'pending' && (
                <>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #A85D70, #7E4452)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px #E8C7CE',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <CheckCircle2 size={15} /> Confirmer le RDV
                  </button>
                  <button
                    onClick={() => changeStatus('cancelled')}
                    disabled={loading}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: 'transparent',
                      border: '1px solid #F0CCCC',
                      color: '#C94F4F',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Refuser
                  </button>
                </>
              )}
              {appointment.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => changeStatus('completed')}
                    disabled={loading}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #A85D70, #7E4452)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px #E8C7CE',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <CheckCircle2 size={15} /> Marquer terminé
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => changeStatus('no_show')}
                      disabled={loading}
                      style={{
                        height: '38px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid #FFFFFF',
                        color: '#8A6E74',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      No-show
                    </button>
                    <button
                      onClick={() => changeStatus('cancelled')}
                      disabled={loading}
                      style={{
                        height: '38px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid #FBECEC',
                        color: '#C94F4F',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={deleteAppt}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
                  color: '#B8A6AA',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#C94F4F'}
                onMouseLeave={e => e.currentTarget.style.color = '#B8A6AA'}
              >
                Supprimer le rendez-vous
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
