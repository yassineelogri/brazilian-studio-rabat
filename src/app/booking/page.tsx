import { createAnonSupabaseClient } from '@/lib/supabase/server'
import BookingForm from '@/components/booking/BookingForm'

export const dynamic = 'force-dynamic'


export default async function BookingPage() {
  const supabase = createAnonSupabaseClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div style={{ minHeight: '100vh', background: '#141210' }}>
      <div style={{ background: 'linear-gradient(135deg, #1C1816 0%, #141210 100%)', padding: '48px 24px 64px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '16px', fontWeight: 700, color: '#1A1410', letterSpacing: '0.05em' }}>BS</div>
        <p style={{ fontSize: '10px', color: 'rgba(201,169,110,0.6)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '12px' }}>Brazilian Studio Rabat</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '32px', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>Prendre rendez-vous</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '8px' }}>Lun – Sam · 10h00 – 20h00</p>
      </div>
      <div style={{ padding: '0 16px 48px', maxWidth: '640px', margin: '0 auto' }}>
        <BookingForm services={services ?? []} />
      </div>
    </div>
  )
}
