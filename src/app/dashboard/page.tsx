import { createServerSupabaseClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/StatCard'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp, Users } from 'lucide-react'

export const revalidate = 60 // refresh stats every minute

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('date', today)
    .in('status', ['pending', 'confirmed'])

  const { data: pendingAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('status', 'pending')
    .gte('date', today)

  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })

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

  const factureRevenue = (paidFactures ?? []).reduce((sum: number, f: { paid_amount: number | null }) => sum + (f.paid_amount ?? 0), 0)
  const productRevenue = (weekProductSales ?? []).reduce((sum: number, s: { unit_price: number | null; quantity: number | null }) => sum + (s.unit_price ?? 0) * (s.quantity ?? 0), 0)
  const weekRevenue = factureRevenue + productRevenue

  const todayCount   = todayAppts?.length ?? 0
  const pendingCount = pendingAppts?.length ?? 0

  const { data: todayApptsDetail } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, status, clients(name), services(name, color)')
    .eq('date', today)
    .in('status', ['pending', 'confirmed'])
    .order('start_time')

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '32px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px' }}>Bonjour ✦</h1>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Aujourd'hui" value={todayCount} sub="rendez-vous" accent="bg-salon-gold" icon={CalendarDays} iconColor="text-salon-gold" />
        <StatCard label="En attente" value={pendingCount} sub="à confirmer" accent="bg-amber-400" icon={Clock} iconColor="text-amber-500" />
        <StatCard label="Clients" value={clientCount ?? 0} sub="au total" accent="bg-salon-rose" icon={Users} iconColor="text-salon-rose" />
        <StatCard label="Cette semaine" value={`${weekRevenue.toLocaleString('fr-FR')} MAD`} sub="chiffre d'affaires" accent="bg-green-400" icon={TrendingUp} iconColor="text-green-500" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/dashboard/calendar" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', color: '#1A1410', borderRadius: '12px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          <CalendarDays size={15} /> Voir le calendrier
        </Link>
        <Link href="/dashboard/appointments/new" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', fontSize: '13px', textDecoration: 'none' }}>
          <Clock size={15} /> Nouveau RDV
        </Link>
        <Link href="/dashboard/ventes/new" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', fontSize: '13px', textDecoration: 'none' }}>
          <TrendingUp size={15} /> Nouvelle vente
        </Link>
      </div>

      {/* Today's appointment list */}
      {todayApptsDetail && todayApptsDetail.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontFamily: 'serif', fontSize: '20px', fontWeight: 300, color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>Aujourd&apos;hui</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(todayApptsDetail as any[]).map(a => (
              <div key={a.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '4px', flexShrink: 0, backgroundColor: (a.services as any)?.color ?? '#C9A96E' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(a.clients as any)?.name}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{(a.services as any)?.name}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>{a.start_time?.slice(0, 5)}</p>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '2px',
                    background: a.status === 'confirmed' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                    color: a.status === 'confirmed' ? '#4ADE80' : '#FBBF24',
                  }}>
                    {a.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
