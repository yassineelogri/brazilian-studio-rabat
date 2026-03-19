'use client'

import { useState } from 'react'
import { X, Phone } from 'lucide-react'
import type { AppointmentWithRelations } from '@/lib/supabase/types'

interface Props {
  appointment: AppointmentWithRelations | null
  onClose: () => void
  onAction: () => void // called after any action to refresh data
}

const STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ En attente',
  confirmed: '✅ Confirmé',
  cancelled: '❌ Annulé',
  completed: '✔ Terminé',
  no_show:   '🚫 No-show',
}

export default function AppointmentSlideOver({ appointment, onClose, onAction }: Props) {
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

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

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-salon-dark">Rendez-vous</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Status badge */}
          <span className="inline-block text-xs font-medium px-2 py-1 rounded-full bg-salon-pink text-salon-dark">
            {STATUS_LABELS[appointment.status]}
          </span>

          {/* Client */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Client</p>
            <p className="font-medium text-salon-dark">{appointment.clients?.name}</p>
            <a
              href={`tel:${appointment.clients?.phone}`}
              className="flex items-center gap-1 text-sm text-salon-gold mt-1 hover:underline"
            >
              <Phone size={13} /> {appointment.clients?.phone}
            </a>
          </div>

          {/* Service */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Service</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: appointment.services?.color }} />
              <p className="font-medium text-salon-dark">{appointment.services?.name}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Date &amp; Heure</p>
            <p className="font-medium text-salon-dark">{appointment.date}</p>
            <p className="text-sm text-salon-muted">
              {appointment.start_time.slice(0, 5)} → {appointment.end_time.slice(0, 5)}
              {' '}({appointment.duration_minutes} min)
            </p>
          </div>

          {/* Staff */}
          <div>
            <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Staff assigné</p>
            <p className="text-salon-dark">
              {appointment.staff?.name
                ? appointment.staff.name
                : <span className="text-gray-400 italic">Non assigné</span>}
            </p>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <p className="text-xs text-salon-muted uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-salon-dark bg-salon-cream p-3 rounded-lg">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {appointment.status === 'pending' && (
            <>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium hover:bg-salon-dark transition disabled:opacity-60"
              >
                ✅ Confirmer
              </button>
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={loading}
                className="w-full py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-60"
              >
                Annuler
              </button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <>
              <button
                onClick={() => changeStatus('completed')}
                disabled={loading}
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-60"
              >
                ✔ Marquer terminé
              </button>
              <button
                onClick={() => changeStatus('no_show')}
                disabled={loading}
                className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-60"
              >
                No-show
              </button>
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={loading}
                className="w-full py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-60"
              >
                Annuler
              </button>
            </>
          )}
          <button
            onClick={deleteAppt}
            disabled={loading}
            className="w-full py-2 text-xs text-gray-300 hover:text-red-400 transition"
          >
            Supprimer
          </button>
        </div>
      </div>
    </>
  )
}
