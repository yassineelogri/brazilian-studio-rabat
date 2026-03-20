import { createAnonSupabaseClient } from '@/lib/supabase/server'
import BookingForm from '@/components/booking/BookingForm'

export const revalidate = 3600

export default async function BookingPage() {
  const supabase = createAnonSupabaseClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-salon-cream py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold text-salon-dark">Prendre rendez-vous</h1>
        <p className="text-salon-muted mt-2">Brazilian Studio Rabat · Lun–Sam 10h00–20h00</p>
      </div>
      <BookingForm services={services ?? []} />
    </div>
  )
}
