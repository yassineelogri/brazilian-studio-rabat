import { ChevronRight, Clock } from 'lucide-react'
import type { Service } from '@/lib/supabase/types'
import { formatDurationRange, formatServicePrice } from '@/lib/services'
import styles from './Booking.module.css'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

/* Match a service to one of the site's real photos by keyword. */
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

export default function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div>
      <h2 className={styles.stepTitle}>Quel soin vous ferait plaisir ?</h2>
      <p className={styles.stepHint}>Selectionnez un service pour voir les disponibilites.</p>

      <div className={styles.serviceList}>
        {services.map(service => {
          const img = serviceImage(service.name)
          const priceLabel = formatServicePrice(service.price)
          return (
            <button
              key={service.id}
              className={styles.serviceCard}
              data-selected={selectedId === service.id}
              onClick={() => onSelect(service)}
            >
              {img ? (
                <img src={img} alt="" className={styles.serviceThumb} loading="lazy" decoding="async" />
              ) : (
                <span className={styles.serviceThumbFallback} aria-hidden="true">
                  {service.name.charAt(0)}
                </span>
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
  )
}
