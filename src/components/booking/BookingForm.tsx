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
        <div className="w-16 h-16 rounded-full bg-salon-pink flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-salon-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
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

  const STEP_LABELS = ['Service', 'Date', 'Heure', 'Vous']

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-start mb-8">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-200 ${
                n < stepNumber[step] ? 'bg-salon-gold text-white' :
                n === stepNumber[step] ? 'bg-salon-dark text-salon-pink ring-2 ring-salon-gold/40 ring-offset-2' :
                'bg-salon-rose/20 text-salon-muted'
              }`}>
                {n < stepNumber[step] ? '✓' : n}
              </div>
              <span className={`text-[10px] tracking-wide hidden sm:block ${n <= stepNumber[step] ? 'text-salon-dark font-medium' : 'text-salon-muted'}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-px mx-2 mb-5 transition-colors duration-300 ${n < stepNumber[step] ? 'bg-salon-gold' : 'bg-salon-rose/20'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-card border border-salon-rose/20 p-6 sm:p-8">
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
