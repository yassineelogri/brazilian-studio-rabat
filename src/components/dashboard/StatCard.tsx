import { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: LucideIcon
  iconColor?: string
}

export default function StatCard({ label, value, sub, accent = 'bg-salon-gold', icon: Icon, iconColor = 'text-salon-gold' }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-salon-rose/15 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden">
      {/* Subtle bg decoration */}
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-salon-cream opacity-60" />

      {/* Top row: accent + icon */}
      <div className="flex items-start justify-between relative">
        <div className={`h-1 w-8 rounded-full ${accent}`} />
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-salon-cream ${iconColor}`}>
            <Icon size={15} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative">
        <p className="font-serif text-3xl text-salon-dark leading-none">{value}</p>
        <p className="text-[10px] text-salon-muted uppercase tracking-widest mt-1">{label}</p>
        {sub && <p className="text-[11px] text-salon-muted/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
