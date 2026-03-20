import type { Service } from '@/lib/supabase/types'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export default function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-salon-dark mb-4">Choisissez un service</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`text-left p-4 rounded-xl border-2 transition ${
              selectedId === service.id
                ? 'border-salon-gold bg-salon-pink'
                : 'border-gray-100 hover:border-salon-rose bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
              <span className="font-medium text-salon-dark">{service.name}</span>
            </div>
            <p className="text-xs text-salon-muted mt-1 ml-6">
              {service.min_duration}–{service.max_duration} min
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
