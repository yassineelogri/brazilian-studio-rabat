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
    <div className="min-h-screen bg-salon-cream-light">
      <div className="bg-gradient-to-br from-salon-dark to-salon-sidebar-bottom px-6 pt-10 pb-16 text-center">
        <p className="text-xs text-salon-pink/60 tracking-[0.25em] uppercase mb-3">Brazilian Studio Rabat</p>
        <h1 className="font-serif text-4xl text-salon-pink font-medium">Prendre rendez-vous</h1>
        <p className="text-salon-pink/50 text-sm mt-2">Lun – Sam · 10h00 – 20h00</p>
      </div>
      <div className="px-4 -mt-8 max-w-2xl mx-auto pb-12">
        <BookingForm services={services ?? []} />
      </div>
    </div>
  )
}
