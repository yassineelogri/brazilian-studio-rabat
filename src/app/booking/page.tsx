import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, MessageCircle, Star } from 'lucide-react'
import { createAnonSupabaseClient } from '@/lib/supabase/server'
import BookingForm from '@/components/booking/BookingForm'
import styles from '@/components/booking/Booking.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Réserver en ligne',
  description:
    'Réservez votre soin chez Brazilian Studio Rabat en une minute : choisissez votre service, votre date et votre horaire. Confirmation rapide par WhatsApp.',
}

export default async function BookingPage() {
  const supabase = createAnonSupabaseClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.topBarLogo}>Brazilian Studio</Link>
        <Link href="/" className={styles.topBarBack}>← Retour au site</Link>
      </div>

      <header className={styles.header}>
        <span className={styles.kicker}>Réservation en ligne</span>
        <h1 className={styles.title}>Réservez en une minute</h1>
        <p className={styles.lead}>
          Choisissez votre soin, votre date et votre horaire. Nous nous occupons du reste.
        </p>
      </header>

      <div className={styles.trustStrip}>
        <span className={styles.trustItem}>
          <Star size={15} fill="currentColor" /> 4.9 sur Google
        </span>
        <span className={styles.trustItem}>
          <MessageCircle size={15} /> Confirmation rapide par WhatsApp
        </span>
        <span className={styles.trustItem}>
          <MapPin size={15} /> Rabat-Agdal - Tous les jours 10h-20h
        </span>
      </div>

      <main className={styles.main}>
        <BookingForm services={services ?? []} />
      </main>
    </div>
  )
}
