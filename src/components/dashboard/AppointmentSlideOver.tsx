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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente',  bg: 'bg-amber-50',  text: 'text-amber-700',  icon: <Clock size={13} /> },
  confirmed: { label: 'Confirmé',    bg: 'bg-green-50',  text: 'text-green-700',  icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Annulé',      bg: 'bg-gray-100',  text: 'text-gray-500',   icon: <XCircle size={13} /> },
  completed: { label: 'Terminé',     bg: 'bg-blue-50',   text: 'text-blue-700',   icon: <CheckCircle2 size={13} /> },
  no_show:   { label: 'No-show',     bg: 'bg-red-50',    text: 'text-red-600',    icon: <AlertCircle size={13} /> },
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-salon-muted flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-salon-muted uppercase tracking-widest mb-0.5">{label}</p>
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

  const color = appointment?.services?.color ?? '#B76E79'
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
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Gradient header */}
            <div
              className="relative px-5 pt-5 pb-6 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: `linear-gradient(180deg, ${color}, ${color}55)` }}
              />
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg text-salon-dark leading-tight truncate">
                    {appointment.services?.name ?? 'Rendez-vous'}
                  </p>
                  <p className="text-sm text-salon-muted mt-0.5 truncate">{appointment.clients?.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-salon-muted hover:text-salon-dark transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status badge */}
              {status && (
                <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.icon}
                  {status.label}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <InfoRow icon={<User size={14} />} label="Client">
                <p className="font-medium text-salon-dark">{appointment.clients?.name}</p>
                {appointment.clients?.phone && (
                  <a
                    href={`tel:${appointment.clients.phone}`}
                    className="flex items-center gap-1.5 text-sm text-salon-gold hover:text-salon-dark transition-colors mt-0.5"
                  >
                    <Phone size={12} /> {appointment.clients.phone}
                  </a>
                )}
              </InfoRow>

              <InfoRow icon={<Scissors size={14} />} label="Service">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <p className="font-medium text-salon-dark">{appointment.services?.name}</p>
                </div>
              </InfoRow>

              <InfoRow icon={<Calendar size={14} />} label="Date & Heure">
                <p className="font-medium text-salon-dark capitalize">{dateStr}</p>
                <p className="text-sm text-salon-muted mt-0.5">
                  {appointment.start_time.slice(0, 5)} – {appointment.end_time.slice(0, 5)}
                  <span className="ml-1.5 text-xs bg-salon-pink/40 text-salon-dark px-1.5 py-0.5 rounded-full">
                    {appointment.duration_minutes} min
                  </span>
                </p>
              </InfoRow>

              <InfoRow icon={<User size={14} />} label="Staff assigné">
                {appointment.staff?.name
                  ? <p className="font-medium text-salon-dark">{appointment.staff.name}</p>
                  : <p className="text-sm text-salon-muted italic">Non assigné</p>}
              </InfoRow>

              {appointment.notes && (
                <InfoRow icon={<MinusCircle size={14} />} label="Notes">
                  <p className="text-sm text-salon-dark bg-salon-cream/60 p-3 rounded-xl leading-relaxed">
                    {appointment.notes}
                  </p>
                </InfoRow>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-salon-rose/15 space-y-2 flex-shrink-0">
              {appointment.status === 'pending' && (
                <>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full h-10 bg-gradient-to-r from-salon-dark to-salon-sidebar-bottom text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} /> Confirmer le RDV
                  </button>
                  <button
                    onClick={() => changeStatus('cancelled')}
                    disabled={loading}
                    className="w-full h-10 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-60 cursor-pointer"
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
                    className="w-full h-10 bg-salon-gold text-white rounded-xl text-sm font-medium hover:bg-salon-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} /> Marquer terminé
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => changeStatus('no_show')}
                      disabled={loading}
                      className="h-9 border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      No-show
                    </button>
                    <button
                      onClick={() => changeStatus('cancelled')}
                      disabled={loading}
                      className="h-9 border border-red-200 text-red-500 rounded-xl text-xs hover:bg-red-50 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={deleteAppt}
                disabled={loading}
                className="w-full py-2 text-xs text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
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
