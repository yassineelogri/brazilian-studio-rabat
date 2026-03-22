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
  pending:   { label: 'En attente',  color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  icon: <Clock size={13} /> },
  confirmed: { label: 'Confirmé',    color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',   icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Annulé',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)',  icon: <XCircle size={13} /> },
  completed: { label: 'Terminé',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   icon: <CheckCircle2 size={13} /> },
  no_show:   { label: 'No-show',     color: '#F87171', bg: 'rgba(248,113,113,0.1)',  icon: <AlertCircle size={13} /> },
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ marginTop: '2px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '2px', fontWeight: 500 }}>{label}</p>
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

  const color = appointment?.services?.color ?? '#C9A96E'
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
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
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
              background: '#1C1816',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
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
                  <p style={{ fontFamily: 'serif', fontSize: '18px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                    {appointment.services?.name ?? 'Rendez-vous'}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)',
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
                <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{appointment.clients?.name}</p>
                {appointment.clients?.phone && (
                  <a
                    href={`tel:${appointment.clients.phone}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#C9A96E', marginTop: '4px', textDecoration: 'none' }}
                  >
                    <Phone size={12} /> {appointment.clients.phone}
                  </a>
                )}
              </InfoRow>

              <InfoRow icon={<Scissors size={14} />} label="Service">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: color, boxShadow: `0 0 6px ${color}50` }} />
                  <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{appointment.services?.name}</p>
                </div>
              </InfoRow>

              <InfoRow icon={<Calendar size={14} />} label="Date & Heure">
                <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontSize: '14px', textTransform: 'capitalize' }}>{dateStr}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(201,169,110,0.1)',
                    color: '#C9A96E',
                    border: '1px solid rgba(201,169,110,0.15)',
                  }}>
                    {appointment.duration_minutes} min
                  </span>
                </p>
              </InfoRow>

              <InfoRow icon={<User size={14} />} label="Staff assigné">
                {appointment.staff?.name
                  ? <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{appointment.staff.name}</p>
                  : <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Non assigné</p>}
              </InfoRow>

              {appointment.notes && (
                <InfoRow icon={<MinusCircle size={14} />} label="Notes">
                  <p style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '12px',
                    borderRadius: '12px',
                    lineHeight: 1.6,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {appointment.notes}
                  </p>
                </InfoRow>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      background: 'linear-gradient(135deg, #C9A96E, #B8944F)',
                      color: '#1A1410',
                      boxShadow: '0 4px 16px rgba(201,169,110,0.2)',
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
                      border: '1px solid rgba(248,113,113,0.2)',
                      color: '#F87171',
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
                      background: 'linear-gradient(135deg, #C9A96E, #B8944F)',
                      color: '#1A1410',
                      boxShadow: '0 4px 16px rgba(201,169,110,0.2)',
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
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.4)',
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
                        border: '1px solid rgba(248,113,113,0.15)',
                        color: '#F87171',
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
                  color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
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
