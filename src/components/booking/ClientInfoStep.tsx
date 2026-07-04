import { ShieldCheck } from 'lucide-react'
import styles from './Booking.module.css'

interface ClientInfo {
  name: string
  phone: string
  email: string
}

interface Props {
  info: ClientInfo
  onChange: (info: ClientInfo) => void
}

export default function ClientInfoStep({ info, onChange }: Props) {
  function update(field: keyof ClientInfo, value: string) {
    onChange({ ...info, [field]: value })
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>Presque terminé !</h2>
      <p className={styles.stepHint}>Vos coordonnées pour confirmer le rendez-vous.</p>

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label htmlFor="booking-name">Nom complet</label>
          <input
            id="booking-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            value={info.name}
            onChange={e => update('name', e.target.value)}
            required
            placeholder="Votre nom"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="booking-phone">Téléphone</label>
          <input
            id="booking-phone"
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={info.phone}
            onChange={e => update('phone', e.target.value)}
            required
            placeholder="06 XX XX XX XX"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="booking-email">
            Email <span>(optionnel, pour recevoir la confirmation)</span>
          </label>
          <input
            id="booking-email"
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={info.email}
            onChange={e => update('email', e.target.value)}
            placeholder="votre@email.com"
          />
        </div>
      </div>

      <p className={styles.confirmNote}>
        <ShieldCheck size={18} />
        Vos informations restent confidentielles. Nous vous confirmons le rendez-vous par téléphone ou WhatsApp.
      </p>
    </div>
  )
}
