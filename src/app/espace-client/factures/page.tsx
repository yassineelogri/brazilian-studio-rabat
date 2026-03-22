'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Facture } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

type FactureRow = Pick<Facture, 'id' | 'number' | 'status' | 'paid_at' | 'payment_method' | 'created_at'>

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyé', paid: 'Payée', cancelled: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte', transfer: 'Virement',
}

export default function ClientFacturesPage() {
  const supabase = createClient()
  const [factures, setFactures] = useState<FactureRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.resolve(
      supabase
        .from('factures')
        .select('id, number, status, paid_at, payment_method, created_at')
        .order('created_at', { ascending: false })
    )
      .then(({ data }) => {
        if (data) setFactures(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-salon-cream">
      <div className="bg-white border-b border-salon-rose/20 px-4 py-3">
        <Link href="/espace-client/dashboard" className="text-sm text-salon-muted hover:text-salon-pink">← Retour</Link>
        <h1 className="font-semibold text-salon-dark mt-1">Mes factures</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-salon-muted text-sm">Chargement...</p>
        ) : factures.length === 0 ? (
          <p className="text-salon-muted text-sm">Aucune facture.</p>
        ) : (
          <div className="space-y-2">
            {factures.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-salon-rose/20 p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium text-salon-dark">{f.number}</p>
                  <p className="text-xs text-salon-muted">{new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                    {STATUS_LABELS[f.status] ?? f.status}
                  </span>
                  {f.status === 'paid' && f.paid_at && (
                    <p className="text-xs text-salon-muted mt-0.5">
                      Payée le {new Date(f.paid_at).toLocaleDateString('fr-FR')}
                      {f.payment_method ? ` · ${PAYMENT_LABELS[f.payment_method] ?? f.payment_method}` : ''}
                    </p>
                  )}
                </div>
                <a href={`/api/factures/${f.id}/pdf`} target="_blank" rel="noreferrer" title="Télécharger PDF">
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
