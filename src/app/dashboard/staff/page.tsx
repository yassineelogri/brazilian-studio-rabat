'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Staff } from '@/lib/supabase/types'

const ROLE_LABELS: Record<string, string> = {
  worker: 'Employée', manager: 'Gérante', secretary: 'Secrétaire'
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])

  useEffect(() => {
    supabase.from('staff').select('*').order('name').then(({ data }) => setStaff(data ?? []))
  }, [])

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('staff').update({ is_active: !current }).eq('id', id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-salon-dark mb-6">Staff</h1>
      <div className="bg-white rounded-2xl border border-salon-rose/20 overflow-hidden">
        <table className="w-full">
          <thead className="bg-salon-cream text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Nom</th>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Rôle</th>
              <th className="px-4 py-3 text-xs font-medium text-salon-muted uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-salon-dark">{s.name}</td>
                <td className="px-4 py-3 text-sm text-salon-muted">{ROLE_LABELS[s.role] ?? s.role}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                      s.is_active ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-600'
                    }`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
