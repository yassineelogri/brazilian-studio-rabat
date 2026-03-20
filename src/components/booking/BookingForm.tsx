'use client'

import { useState } from 'react'
import type { Service } from '@/lib/supabase/types'
import ServiceStep from './ServiceStep'
import DateStep from './DateStep'
import TimeStep from './TimeStep'
import ClientInfoStep from './ClientInfoStep'

type Step = 'service' | 'date' | 'time' | 'info' | 'success' | 'error'

interface Props {
  services: Service[]
}

export default function BookingForm({ services }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' })
  const [conflictError, setConflictError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stepNumber: Record<Step, number> = { service: 1, date: 2, time: 3, info: 4, success: 4, error: 4 }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.phone) return
    setSubmitting(true)
    setConflictError(false)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { name: clientInfo.name, phone: clientInfo.phone, email: clientInfo.email || undefined },
        service_id: selectedService.id,
        date: selectedDate,
        start_time: selectedTime,
        duration_minutes: selectedService.min_duration,
      }),
    })

    setSubmitting(false)

    if (res.status === 409) {
      setConflictError(true)
      setStep('time')
      return
    }
    if (!res.ok) {
      setStep('error')
      return
    }
    setStep('success')
  }

  function reset() {
    setStep('service')
    setSelectedService(null)
    setSelectedDate('')
    setSelectedTime('')
    setClientInfo({ name: '', phone: '', email: '' })
    setConflictError(false)
  }

  if (step === 'success') {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">🌸</div>
        <h2 className="text-2xl font-semibold text-salon-dark mb-2">Merci !</h2>
        <p className="text-salon-muted max-w-sm mx-auto">
          Nous avons bien reçu votre demande. Nous vous confirmerons votre rendez-vous sous peu.
        </p>
        <button onClick={reset} className="mt-6 text-salon-gold underline text-sm">
          Prendre un autre rendez-vous
        </button>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">Une erreur est survenue. Veuillez réessayer.</p>
        <button onClick={() => setStep('info')} className="text-salon-gold underline text-sm">Réessayer</button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
              n <= stepNumber[step] ? 'bg-salon-gold text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {n}
            </div>
            {i < 3 && <div className={`flex-1 h-px mx-2 ${n < stepNumber[step] ? 'bg-salon-gold' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-salon-rose/20 p-6">
        {step === 'service' && (
          <ServiceStep
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={s => { setSelectedService(s); setStep('date') }}
          />
        )}

        {step === 'date' && (
          <>
            <DateStep selectedDate={selectedDate} onChange={setSelectedDate} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('service')} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-salon-gold transition">
                Retour
              </button>
              <button
                onClick={() => setStep('time')}
                disabled={!selectedDate}
                className="flex-1 py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-salon-dark transition"
              >
                Continuer
              </button>
            </div>
          </>
        )}

        {step === 'time' && (
          <>
            {conflictError && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">
                Ce créneau n&apos;est plus disponible. Veuillez en choisir un autre.
              </p>
            )}
            <TimeStep
              date={selectedDate}
              durationMinutes={selectedService?.min_duration ?? 60}
              selectedTime={selectedTime}
              onSelect={t => { setSelectedTime(t); setStep('info') }}
            />
            <button onClick={() => setStep('date')} className="mt-4 text-salon-muted text-sm underline">
              Retour
            </button>
          </>
        )}

        {step === 'info' && (
          <>
            <ClientInfoStep info={clientInfo} onChange={setClientInfo} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('time')} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-salon-muted hover:border-salon-gold transition">
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !clientInfo.name || !clientInfo.phone}
                className="flex-1 py-2.5 bg-salon-gold text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-salon-dark transition"
              >
                {submitting ? 'Envoi...' : 'Confirmer le rendez-vous'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
