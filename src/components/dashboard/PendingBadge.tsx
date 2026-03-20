'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PendingBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCount() {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setCount(count ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel('pending-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-salon-gold text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
      {count > 9 ? '9+' : count}
    </span>
  )
}
