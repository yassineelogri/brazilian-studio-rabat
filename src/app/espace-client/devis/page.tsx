'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Devis } from '@/lib/supabase/types'

type DevisRow = Pick<Devis, 'id' | 'number' | 'status' | 'tva_rate' | 'valid_until' | 'created_at'>

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
}

export default function ClientDevisPage() {
  const supabase = createClient()
  const [devis, setDevis] = useState<DevisRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.resolve(
      supabase
        .from('devis')
        .select('id, number, status, tva_rate, valid_until, created_at')
        .order('created_at', { ascending: false })
    )
      .then(({ data }) => {
        if (data) setDevis(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mes devis</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : devis.length === 0 ? (
          <p className="text-salon-muted text-sm">Aucun devis.</p>
        ) : (
          <div className="space-y-2">
            {devis.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-salon-rose/20 p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium text-salon-dark">{d.number}</p>
                  <p className="text-xs text-salon-muted">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </div>
                <a href={`/api/devis/${d.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
                  <Download size={16} className="text-salon-muted hover:text-salon-dark" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
