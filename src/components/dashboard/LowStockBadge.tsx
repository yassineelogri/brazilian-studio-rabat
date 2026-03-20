'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LowStockBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCount() {
      const { data } = await supabase
        .from('products')
        .select('id, stock_quantity, low_stock_threshold')
        .eq('is_active', true)

      if (data) {
        const lowStock = data.filter(p => p.stock_quantity <= p.low_stock_threshold)
        setCount(lowStock.length)
      }
    }

    fetchCount()

    const channel = supabase
      .channel('low_stock_products')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
      }, () => fetchCount())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
      {count}
    </span>
  )
}
