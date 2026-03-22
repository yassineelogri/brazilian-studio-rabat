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

const STEP_LABELS = ['Service', 'Date', 'Heure', 'Vous']

const btnPrimary: React.CSSProperties = {
  flex: 1, padding: '12px',
  background: 'linear-gradient(135deg, #C9A96E, #B8944F)',
  color: '#1A1410', borderRadius: '12px',
  fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px',
}

const btnSecondary: React.CSSProperties = {
  flex: 1, padding: '12px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.6)', borderRadius: '12px',
  fontSize: '14px', cursor: 'pointer',
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

    if (res.status === 409) { setConflictError(true); setStep('time'); return }
    if (!res.ok) { setStep('error'); return }
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
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#4ADE80" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'serif', fontSize: '26px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>Merci !</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', maxWidth: '320px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Nous avons bien reçu votre demande. Nous vous confirmerons votre rendez-vous sous peu.
        </p>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>
          Prendre un autre rendez-vous
        </button>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#F87171', marginBottom: '16px', fontSize: '14px' }}>Une erreur est survenue. Veuillez réessayer.</p>
        <button onClick={() => setStep('info')} style={{ background: 'none', border: 'none', color: '#C9A96E', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}>Réessayer</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '28px 0 0' }}>
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600,
                background: n < stepNumber[step] ? 'linear-gradient(135deg, #C9A96E, #B8944F)' : n === stepNumber[step] ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.06)',
                border: n === stepNumber[step] ? '1px solid rgba(201,169,110,0.4)' : '1px solid transparent',
                color: n < stepNumber[step] ? '#1A1410' : n === stepNumber[step] ? '#C9A96E' : 'rgba(255,255,255,0.3)',
              }}>
                {n < stepNumber[step] ? '✓' : n}
              </div>
              <span style={{ fontSize: '10px', letterSpacing: '0.05em', color: n <= stepNumber[step] ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < 3 && (
              <div style={{ flex: 1, height: '1px', margin: '0 8px 16px', background: n < stepNumber[step] ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', marginTop: '8px' }}>
        {step === 'service' && (
          <ServiceStep services={services} selectedId={selectedService?.id ?? null} onSelect={s => { setSelectedService(s); setStep('date') }} />
        )}

        {step === 'date' && (
          <>
            <DateStep selectedDate={selectedDate} onChange={setSelectedDate} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep('service')} style={btnSecondary}>Retour</button>
              <button onClick={() => setStep('time')} disabled={!selectedDate} style={{ ...btnPrimary, opacity: !selectedDate ? 0.4 : 1, cursor: !selectedDate ? 'not-allowed' : 'pointer' }}>Continuer</button>
            </div>
          </>
        )}

        {step === 'time' && (
          <>
            {conflictError && (
              <p style={{ fontSize: '13px', color: '#F87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                Ce créneau n&apos;est plus disponible. Veuillez en choisir un autre.
              </p>
            )}
            <TimeStep date={selectedDate} durationMinutes={selectedService?.min_duration ?? 60} selectedTime={selectedTime} onSelect={t => { setSelectedTime(t); setStep('info') }} />
            <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', marginTop: '16px', textDecoration: 'underline' }}>Retour</button>
          </>
        )}

        {step === 'info' && (
          <>
            <ClientInfoStep info={clientInfo} onChange={setClientInfo} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep('time')} style={btnSecondary}>Retour</button>
              <button onClick={handleSubmit} disabled={submitting || !clientInfo.name || !clientInfo.phone}
                style={{ ...btnPrimary, opacity: submitting || !clientInfo.name || !clientInfo.phone ? 0.5 : 1, cursor: submitting || !clientInfo.name || !clientInfo.phone ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Envoi...' : 'Confirmer le rendez-vous'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
