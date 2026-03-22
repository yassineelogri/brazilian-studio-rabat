interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string // tailwind color class for the top border
}

export default function StatCard({ label, value, sub, accent = 'bg-salon-gold' }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-salon-rose/15 shadow-sm p-5 flex flex-col gap-2">
      <div className={`h-0.5 w-8 rounded-full ${accent}`} />
      <p className="text-xs text-salon-muted uppercase tracking-widest">{label}</p>
      <p className="font-serif text-3xl text-salon-dark leading-none">{value}</p>
      {sub && <p className="text-xs text-salon-muted">{sub}</p>}
    </div>
  )
}
