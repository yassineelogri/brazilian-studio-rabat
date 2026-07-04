'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CalendarDays, Clock, CheckCircle2, MessageCircle } from 'lucide-react'
import type { Service } from '@/lib/supabase/types'
import ServiceStep from './ServiceStep'
import DateStep from './DateStep'
import TimeStep from './TimeStep'
import ClientInfoStep from './ClientInfoStep'
import styles from './Booking.module.css'

type Step = 'service' | 'date' | 'time' | 'info' | 'success' | 'error'

interface Props {
  services: Service[]
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const STEP_LABELS = ['Soin', 'Date', 'Heure', 'Vous']
const WA_NUMBER = '212661215800'

export function formatDateFr(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

export default function BookingForm({ services }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' })
  const [conflictError, setConflictError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stepNumber: Record<Step, number> = { service: 1, date: 2, time: 3, info: 4, success: 5, error: 4 }
  const current = stepNumber[step]

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

    if (res.status === 409) { setConflictError(true); setSelectedTime(''); setStep('time'); return }
    if (!res.ok) { setStep('error'); return }
    setStep('success')
  }

  const waHref = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    'Bonjour, je souhaite prendre rendez-vous chez Brazilian Studio Rabat.'
  )}`

  const waConfirmHref = selectedService
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
        `Bonjour, je viens de réserver en ligne : ${selectedService.name}, ${formatDateFr(selectedDate)} à ${selectedTime}, au nom de ${clientInfo.name}.`
      )}`
    : waHref

  if (step === 'success') {
    return (
      <motion.div
        className={styles.finalScreen}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className={styles.finalIcon}>
          <CheckCircle2 size={34} />
        </div>
        <h2 className={styles.finalTitle}>Demande envoyée !</h2>
        <p className={styles.finalText}>
          Merci {clientInfo.name.split(' ')[0]}. Nous vous confirmons votre rendez-vous très vite par téléphone ou WhatsApp.
        </p>

        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Soin</span>
            <span className={styles.summaryValue}>{selectedService?.name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Date</span>
            <span className={styles.summaryValue}>{formatDateFr(selectedDate)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Heure</span>
            <span className={styles.summaryValue}>{selectedTime}</span>
          </div>
        </div>

        <div className={styles.finalActions}>
          <a href={waConfirmHref} target="_blank" rel="noopener noreferrer" className={styles.btnWhatsApp}>
            <MessageCircle size={18} /> Nous écrire sur WhatsApp
          </a>
          <Link href="/" className={styles.btnHome}>Retour à l&apos;accueil</Link>
        </div>
      </motion.div>
    )
  }

  if (step === 'error') {
    return (
      <div className={styles.finalScreen}>
        <h2 className={styles.finalTitle}>Oups, un imprévu</h2>
        <p className={styles.finalText}>
          Votre demande n&apos;a pas pu être envoyée. Réessayez, ou réservez directement sur WhatsApp : nous répondons vite.
        </p>
        <div className={styles.finalActions}>
          <button onClick={() => setStep('info')} className={styles.btnPrimary} style={{ flex: 'none' }}>
            Réessayer
          </button>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className={styles.btnWhatsApp}>
            <MessageCircle size={18} /> Réserver sur WhatsApp
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Progress */}
      <div className={styles.progress}>
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className={styles.progressSegment} data-grow={i < 3}>
            <div className={styles.progressStep}>
              <div className={styles.progressDot} data-state={n < current ? 'done' : n === current ? 'active' : 'todo'}>
                {n < current ? '✓' : n}
              </div>
              <span className={styles.progressLabel} data-state={n === current ? 'active' : undefined}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < 3 && <div className={styles.progressLine} data-done={n < current} />}
          </div>
        ))}
      </div>

      {/* Live recap of choices */}
      {selectedService && step !== 'service' && (
        <div className={styles.recap}>
          <span className={styles.recapItem}>
            <Sparkles size={14} /> {selectedService.name}
          </span>
          {selectedDate && step !== 'date' && (
            <>
              <span className={styles.recapDivider}>·</span>
              <span className={styles.recapItem}>
                <CalendarDays size={14} /> {formatDateFr(selectedDate)}
              </span>
            </>
          )}
          {selectedTime && step === 'info' && (
            <>
              <span className={styles.recapDivider}>·</span>
              <span className={styles.recapItem}>
                <Clock size={14} /> {selectedTime}
              </span>
            </>
          )}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={styles.card}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {step === 'service' && (
            <ServiceStep
              services={services}
              selectedId={selectedService?.id ?? null}
              onSelect={s => { setSelectedService(s); setStep('date') }}
            />
          )}

          {step === 'date' && (
            <>
              <DateStep selectedDate={selectedDate} onChange={d => { setSelectedDate(d); setSelectedTime('') }} />
              <div className={styles.actions}>
                <button onClick={() => setStep('service')} className={styles.btnGhost}>Retour</button>
                <button onClick={() => setStep('time')} disabled={!selectedDate} className={styles.btnPrimary}>
                  Continuer
                </button>
              </div>
            </>
          )}

          {step === 'time' && (
            <>
              {conflictError && (
                <p className={`${styles.alert} ${styles.alertError}`}>
                  Ce créneau vient d&apos;être pris. Choisissez-en un autre, il reste de belles disponibilités.
                </p>
              )}
              <TimeStep
                date={selectedDate}
                durationMinutes={selectedService?.min_duration ?? 60}
                selectedTime={selectedTime}
                onSelect={t => { setSelectedTime(t); setStep('info') }}
              />
              <div className={styles.actions}>
                <button onClick={() => setStep('date')} className={styles.btnGhost}>Retour</button>
              </div>
            </>
          )}

          {step === 'info' && (
            <>
              <ClientInfoStep info={clientInfo} onChange={setClientInfo} />
              <div className={styles.actions}>
                <button onClick={() => setStep('time')} className={styles.btnGhost}>Retour</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !clientInfo.name || !clientInfo.phone}
                  className={styles.btnPrimary}
                >
                  {submitting ? 'Envoi en cours…' : 'Confirmer ma réservation'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <p className={styles.waFallback}>
        Vous préférez discuter ?
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={15} /> Réservez sur WhatsApp
        </a>
      </p>
    </div>
  )
}
