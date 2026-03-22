import { createServerSupabaseClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/StatCard'
import Link from 'next/link'
import { CalendarDays, Clock, TrendingUp, Users, Plus, ShoppingBag } from 'lucide-react'

export const revalidate = 60

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

  const factureRevenue = (paidFactures ?? []).reduce((sum, f) => sum + (f.paid_amount ?? 0), 0)
  const productRevenue = (weekProductSales ?? []).reduce((sum, s) => sum + (s.unit_price ?? 0) * (s.quantity ?? 0), 0)
  const weekRevenue = factureRevenue + productRevenue

  const todayCount = todayAppts?.length ?? 0
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
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.5)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1
          style={{
            fontFamily: 'serif',
            fontSize: '32px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.95)',
            marginTop: '4px',
            letterSpacing: '-0.01em',
          }}
        >
          Bonjour
        </h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Aujourd'hui" value={todayCount} sub="rendez-vous" icon={CalendarDays} />
        <StatCard label="En attente" value={pendingCount} sub="à confirmer" icon={Clock} />
        <StatCard label="Clients" value={clientCount ?? 0} sub="au total" icon={Users} />
        <StatCard label="Cette semaine" value={`${weekRevenue.toLocaleString('fr-FR')} MAD`} sub="chiffre d'affaires" icon={TrendingUp} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap mb-8">
        <Link
          href="/dashboard/calendar"
          className="flex items-center gap-2 text-sm font-medium transition-all duration-200"
          style={{
            padding: '10px 18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.08))',
            border: '1px solid rgba(201,169,110,0.2)',
            color: '#C9A96E',
          }}
        >
          <CalendarDays size={15} /> Calendrier
        </Link>
        <Link
          href="/dashboard/appointments/new"
          className="flex items-center gap-2 text-sm font-medium transition-all duration-200"
          style={{
            padding: '10px 18px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <Plus size={15} /> Nouveau RDV
        </Link>
        <Link
          href="/dashboard/ventes/new"
          className="flex items-center gap-2 text-sm font-medium transition-all duration-200"
          style={{
            padding: '10px 18px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <ShoppingBag size={15} /> Nouvelle vente
        </Link>
      </div>

      {/* Today's appointments */}
      {todayApptsDetail && todayApptsDetail.length > 0 && (
        <div>
          <h2
            style={{
              fontFamily: 'serif',
              fontSize: '18px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              marginBottom: '14px',
            }}
          >
            Aujourd&apos;hui
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(todayApptsDetail as any[]).map(a => (
              <div
                key={a.id}
                style={{
                  borderRadius: '16px',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {/* Service color bar */}
                <div
                  style={{
                    width: '3px',
                    alignSelf: 'stretch',
                    borderRadius: '4px',
                    backgroundColor: a.services?.color ?? '#C9A96E',
                    boxShadow: `0 0 8px ${a.services?.color ?? '#C9A96E'}40`,
                  }}
                />
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.clients?.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {a.services?.name}
                  </p>
                </div>
                {/* Time + status */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {a.start_time?.slice(0, 5)}
                  </p>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      display: 'inline-block',
                      marginTop: '4px',
                      background: a.status === 'confirmed' ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)',
                      color: a.status === 'confirmed' ? '#4ADE80' : '#FBBF24',
                      border: a.status === 'confirmed' ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(251,191,36,0.2)',
                    }}
                  >
                    {a.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!todayApptsDetail || todayApptsDetail.length === 0) && (
        <div
          style={{
            borderRadius: '20px',
            padding: '48px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}
        >
          <CalendarDays size={32} style={{ color: 'rgba(201,169,110,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
            Aucun rendez-vous aujourd&apos;hui
          </p>
          <Link
            href="/dashboard/appointments/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium mt-3"
            style={{ color: '#C9A96E' }}
          >
            <Plus size={14} /> Créer un rendez-vous
          </Link>
        </div>
      )}
    </div>
  )
}
