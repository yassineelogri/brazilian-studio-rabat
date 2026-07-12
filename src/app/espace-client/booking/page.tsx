import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'
import ClientBookingForm from '@/components/booking/ClientBookingForm'

export const dynamic = 'force-dynamic'

export default async function ClientBookingPage() {
  const { client } = await requireClient()
  
  if (!client) {
    redirect('/espace-client')
  }

  const supabase = createServerSupabaseClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at 50% 0%, #3A2027 0%, #170E11 100%)', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative'
    }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(226,167,181,0.05) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(201,143,160,0.05) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

      {/* Header */}
      <header style={{ padding: '24px', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h1 style={{ fontFamily: 'serif', fontSize: '24px', color: '#fff', marginBottom: '4px' }}>Nouveau Rendez-vous</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Réservation rapide pour {client.name.split(' ')[0]}</p>
        </div>
        <Link href="/espace-client/dashboard" style={{ 
          display: 'flex', alignItems: 'center', gap: '6px', 
          background: 'rgba(255,255,255,0.05)', padding: '10px 16px', 
          borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 500,
          border: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <ArrowLeft size={16} /> Retour
        </Link>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px 24px', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
        <ClientBookingForm 
          services={services ?? []} 
          clientId={client.id} 
          clientName={client.name} 
        />
      </main>
    </div>
  )
}
