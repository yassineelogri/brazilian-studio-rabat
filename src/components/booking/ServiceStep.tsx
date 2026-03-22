import type { Service } from '@/lib/supabase/types'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}

export default function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div>
      <h2 className="font-serif text-2xl text-salon-dark mb-5">Choisissez un service</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map(service => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={`text-left p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer w-full ${
              selectedId === service.id
                ? 'border-salon-gold bg-gradient-to-r from-salon-pink/40 to-white shadow-sm'
                : 'border-salon-rose/20 bg-white hover:border-salon-rose hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm" style={{ backgroundColor: service.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-salon-dark leading-tight">{service.name}</p>
                <p className="text-xs text-salon-muted mt-1">{service.min_duration}–{service.max_duration} min</p>
              </div>
              {selectedId === service.id && (
                <svg className="w-4 h-4 text-salon-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
