'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CalendarDays, Clock, CheckCircle2, MessageCircle, ChevronRight } from 'lucide-react'
import type { Service } from '@/lib/supabase/types'
import { formatDurationRange, formatServicePrice } from '@/lib/services'
import styles from './ClientBooking.module.css'

type Step = 'service' | 'date' | 'time' | 'success' | 'error'

interface Props {
  services: Service[]
  clientId: string
  clientName: string
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const STEP_LABELS = ['Soin', 'Date', 'Heure']
const WA_NUMBER = '212661215800'

export function formatDateFr(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

function serviceImage(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('manucure') || n.includes('ongle') || n.includes('nail') || n.includes('pedicure')) return '/russian_manicure.webp'
  if (n.includes('lissage') || n.includes('bresilien') || n.includes('kerat') || n.includes('botox')) return '/smooth_hair.webp'
  if (n.includes('cil') || n.includes('lash') || n.includes('sourcil') || n.includes('brow')) return '/lash_extensions.webp'
  if (n.includes('color') || n.includes('balayage') || n.includes('meche') || n.includes('brush') || n.includes('coiff') || n.includes('cheveu')) return '/hair_coloration.webp'
  if (n.includes('visage') || n.includes('facial') || n.includes('hydra') || n.includes('peau') || n.includes('soin')) return '/skincare_facial.webp'
  if (n.includes('maquillage') || n.includes('makeup')) return '/makeup_artistry.webp'
  if (n.includes('epilation') || n.includes('wax') || n.includes('cire')) return '/epilation_waxing.webp'
  return null
}

export default function ClientBookingForm({ services, clientId, clientName }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [conflictError, setConflictError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const stepNumber: Record<Step, number> = { service: 1, date: 2, time: 3, success: 4, error: 3 }
  const current = stepNumber[step]

  async function handleBook(time: string) {
    if (!selectedService || !selectedDate || !time) return
    setSelectedTime(time)
    setSubmitting(true)
    setConflictError(false)

    const res = await fetch('/api/client/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: selectedService.id,
        date: selectedDate,
        start_time: time,
        duration_minutes: selectedService.min_duration,
      }),
    })

    setSubmitting(false)

    if (res.status === 409) { setConflictError(true); setSelectedTime(''); return }
    if (!res.ok) { setStep('error'); return }
    setStep('success')
  }

  const waHref = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    'Bonjour, je souhaite prendre rendez-vous chez Brazilian Studio Rabat.'
  )}`

  if (step === 'success') {
    return (
      <motion.div
        className={styles.finalScreen}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className={styles.finalIcon}>
          <CheckCircle2 size={40} />
        </div>
        <h2 className={styles.finalTitle}>Réservation confirmée !</h2>
        <p className={styles.finalText}>
          Merci {clientName.split(' ')[0]}. Votre rendez-vous est enregistré dans votre espace client.
        </p>

        <div className={styles.actions}>
          <button onClick={() => window.location.href = '/espace-client/dashboard'} className={styles.btnPrimary}>
            Retour au tableau de bord
          </button>
        </div>
      </motion.div>
    )
  }

  if (step === 'error') {
    return (
      <div className={styles.finalScreen}>
        <h2 className={styles.finalTitle}>Oups, un imprévu</h2>
        <p className={styles.finalText}>
          Votre demande n'a pas pu être envoyée. Veuillez réessayer.
        </p>
        <div className={styles.actions}>
          <button onClick={() => setStep('time')} className={styles.btnPrimary} style={{ flex: 'none' }}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Progress */}
      <div className={styles.progress}>
        {[1, 2, 3].map((n, i) => (
          <div key={n} className={styles.progressSegment} data-grow={i < 2}>
            <div className={styles.progressStep}>
              <div className={styles.progressDot} data-state={n < current ? 'done' : n === current ? 'active' : 'todo'}>
                {n < current ? '✓' : n}
              </div>
              <span className={styles.progressLabel} data-state={n === current ? 'active' : undefined}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < 2 && <div className={styles.progressLine} data-done={n < current} />}
          </div>
        ))}
      </div>

      {/* Recap */}
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
        </div>
      )}

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={styles.card}
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {step === 'service' && (
            <div>
              <h2 className={styles.finalTitle} style={{fontSize: '1.6rem', marginBottom: '1.5rem', textAlign: 'left'}}>Quel soin vous ferait plaisir ?</h2>
              <div className={styles.serviceList}>
                {services.map(service => {
                  const img = serviceImage(service.name)
                  const priceLabel = formatServicePrice(service.price)
                  return (
                    <button
                      key={service.id}
                      className={styles.serviceCard}
                      data-selected={selectedService?.id === service.id}
                      onClick={() => { setSelectedService(service); setStep('date') }}
                    >
                      {img ? (
                        <img src={img} alt="" className={styles.serviceThumbFallback} style={{objectFit: 'cover'}} loading="lazy" decoding="async" />
                      ) : (
                        <span className={styles.serviceThumbFallback} aria-hidden="true">{service.name.charAt(0)}</span>
                      )}
                      <span className={styles.serviceBody}>
                        <span className={styles.serviceName}>{service.name}</span>
                        <span className={styles.serviceMeta}>
                          <Clock size={13} /> {formatDurationRange(service.min_duration, service.max_duration)}
                          {priceLabel ? ` - ${priceLabel}` : ''}
                        </span>
                      </span>
                      <ChevronRight size={18} className={styles.serviceArrow} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 'date' && (
            <div>
              <h2 className={styles.finalTitle} style={{fontSize: '1.6rem', marginBottom: '1.5rem', textAlign: 'left'}}>Choisissez une date</h2>
              <div className={styles.dayGrid}>
                {Array.from({ length: 14 }).map((_, i) => {
                  const d = new Date()
                  d.setDate(d.getDate() + i)
                  const yyyy = d.getFullYear()
                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                  const dd = String(d.getDate()).padStart(2, '0')
                  const ds = `${yyyy}-${mm}-${dd}`
                  const dowStr = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '')

                  return (
                    <button
                      key={ds}
                      className={styles.dayChip}
                      data-selected={selectedDate === ds}
                      onClick={() => { setSelectedDate(ds); setStep('time') }}
                    >
                      <span className={styles.dayChipDow}>{dowStr}</span>
                      <span className={styles.dayChipDate}>{dd}</span>
                    </button>
                  )
                })}
              </div>
              <div className={styles.actions}>
                <button onClick={() => setStep('service')} className={styles.btnGhost}>Retour</button>
              </div>
            </div>
          )}

          {step === 'time' && (
            <div>
              <h2 className={styles.finalTitle} style={{fontSize: '1.6rem', marginBottom: '1.5rem', textAlign: 'left'}}>Choisissez un horaire</h2>
              {conflictError && (
                <p style={{color: '#ff8a8a', background: 'rgba(255, 138, 138, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px'}}>
                  Ce créneau vient d'être pris. Choisissez-en un autre.
                </p>
              )}
              
              <div className={styles.slotGroup}>
                <div className={styles.slotGroupLabel}><Clock size={14}/> Disponibilités</div>
                <div className={styles.slotGrid}>
                  {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'].map(t => (
                    <button
                      key={t}
                      className={styles.slot}
                      onClick={() => handleBook(t)}
                      disabled={submitting}
                      style={{ opacity: submitting && selectedTime !== t ? 0.5 : 1 }}
                    >
                      {submitting && selectedTime === t ? '...' : t}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.actions}>
                <button onClick={() => setStep('date')} disabled={submitting} className={styles.btnGhost}>Retour</button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
