'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users } from 'lucide-react'
import type { Staff } from '@/lib/supabase/types'

const ROLE_LABELS: Record<string, string> = {
  worker: 'Employée', manager: 'Gérante', secretary: 'Secrétaire'
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px',
  fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
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
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)', fontWeight: 500 }}>Gestion</p>
        <h1 style={{ fontFamily: 'serif', fontSize: '28px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} style={{ color: '#C9A96E' }} /> Staff
        </h1>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Nom</th>
              <th style={th}>Rôle</th>
              <th style={th}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{s.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{ROLE_LABELS[s.role] ?? s.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    style={{
                      fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: 500, cursor: 'pointer', border: 'none',
                      background: s.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(156,163,175,0.12)',
                      color: s.is_active ? '#4ADE80' : '#9CA3AF',
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
