import { createServerSupabaseClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/StatCard'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp } from 'lucide-react'

export const revalidate = 60 // refresh stats every minute

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Today's appointments
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('date', today)
    .in('status', ['pending', 'confirmed'])

  // Pending appointments (all upcoming)
  const { data: pendingAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('status', 'pending')
    .gte('date', today)

  // Total clients
  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })

  // This week's revenue (Monday → today)
  // Revenue = paid factures (paid_amount) + product_sales (unit_price * quantity)
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const mondayStr = monday.toISOString().split('T')[0]

  const { data: paidFactures } = await supabase
    .from('factures')
    .select('paid_amount')
    .eq('status', 'paid')
    .gte('paid_at', mondayStr)

  const { data: weekProductSales } = await supabase
    .from('product_sales')
    .select('unit_price, quantity')
    .gte('sold_at', mondayStr)

  const factureRevenue = (paidFactures ?? []).reduce(
    (sum, f) => sum + (f.paid_amount ?? 0),
    0
  )
  const productRevenue = (weekProductSales ?? []).reduce(
    (sum, s) => sum + (s.unit_price ?? 0) * (s.quantity ?? 0),
    0
  )
  const weekRevenue = factureRevenue + productRevenue

  const todayCount   = todayAppts?.length ?? 0
  const pendingCount = pendingAppts?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-salon-muted tracking-widest uppercase">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-serif text-3xl text-salon-dark mt-1">Bonjour ✦</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Aujourd'hui"
          value={todayCount}
          sub="rendez-vous"
          accent="bg-salon-gold"
        />
        <StatCard
          label="En attente"
          value={pendingCount}
          sub="à confirmer"
          accent="bg-amber-400"
        />
        <StatCard
          label="Clients"
          value={clientCount ?? 0}
          sub="au total"
          accent="bg-salon-rose"
        />
        <StatCard
          label="Cette semaine"
          value={`${weekRevenue.toLocaleString('fr-FR')} MAD`}
          sub="chiffre d'affaires"
          accent="bg-green-400"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-2 px-4 py-2.5 bg-salon-dark text-salon-pink rounded-xl text-sm font-medium hover:bg-salon-sidebar-bottom transition-colors"
        >
          <CalendarDays size={15} /> Voir le calendrier
        </Link>
        <Link
          href="/dashboard/appointments/new"
          className="flex items-center gap-2 px-4 py-2.5 border border-salon-rose/30 text-salon-dark rounded-xl text-sm font-medium hover:border-salon-gold hover:text-salon-gold transition-colors"
        >
          <Clock size={15} /> Nouveau RDV
        </Link>
        <Link
          href="/dashboard/ventes/new"
          className="flex items-center gap-2 px-4 py-2.5 border border-salon-rose/30 text-salon-dark rounded-xl text-sm font-medium hover:border-salon-gold hover:text-salon-gold transition-colors"
        >
          <TrendingUp size={15} /> Nouvelle vente
        </Link>
      </div>
    </div>
  )
}
