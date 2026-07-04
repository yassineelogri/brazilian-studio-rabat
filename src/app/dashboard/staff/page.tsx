'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users } from 'lucide-react'
import type { Staff } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

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
    <div style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B26478', fontWeight: 500 }}>
          Gestion
        </p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: '#382227', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} style={{ color: '#8E4457' }} /> Staff
        </h1>
      </div>

      <div style={{
        background: '#FFFFFF',
        border: '1px solid #FFFFFF',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #FFFFFF' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9A8288' }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9A8288' }}>Rôle</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9A8288' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  borderBottom: i < staff.length - 1 ? '1px solid #FFFFFF' : 'none',
                  opacity: s.is_active ? 1 : 0.5,
                }}
              >
                <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#382227' }}>{s.name}</td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#8A6E74' }}>{ROLE_LABELS[s.role] ?? s.role}</td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: s.is_active ? '#E7F6EC' : 'rgba(156,163,175,0.12)',
                      color: s.is_active ? '#1C9950' : '#6B7280',
                      border: s.is_active ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(156,163,175,0.2)',
                    }}
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
