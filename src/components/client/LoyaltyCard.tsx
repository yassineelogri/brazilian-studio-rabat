'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface Loyalty {
  points: number
  visits: number
  tier: { key: string; label: string; perk: string }
  nextTier: { label: string; at: number; missing: number } | null
  progress: number
}

const TIER_COLORS: Record<string, string> = {
  rose: '#E2A7B5',
  'rose-gold': '#EBC3A8',
  diamant: '#CDE3EA',
}

export default function LoyaltyCard({ clientName }: { clientName: string }) {
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null)

  useEffect(() => {
    fetch('/api/client/loyalty')
      .then(res => (res.ok ? res.json() : null))
      .then(setLoyalty)
      .catch(() => setLoyalty(null))
  }, [])

  if (!loyalty) return null

  const tierColor = TIER_COLORS[loyalty.tier.key] ?? '#E2A7B5'

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '22px 22px 20px',
        marginBottom: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #332026 0%, #4A2A35 48%, #2B1A20 100%)',
        border: '1px solid rgba(226, 167, 181, 0.25)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* sheen */}
      <div
        style={{
          position: 'absolute', top: '-60%', right: '-25%', width: '80%', height: '160%',
          background: 'radial-gradient(circle, rgba(226,167,181,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(226,167,181,0.75)', fontWeight: 600 }}>
          Brazilian Club
        </p>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#2B1B1E', background: tierColor, borderRadius: '20px', padding: '4px 10px',
          }}
        >
          <Sparkles size={10} /> {loyalty.tier.label}
        </span>
      </div>

      {/* points */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <p style={{ fontFamily: 'serif', fontSize: '40px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
          {loyalty.points.toLocaleString('fr-FR')}
          <span style={{ fontSize: '14px', color: 'rgba(226,167,181,0.7)', marginLeft: '8px', fontFamily: 'inherit', fontStyle: 'italic' }}>points</span>
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
          {loyalty.visits > 0
            ? `${loyalty.visits} visite${loyalty.visits > 1 ? 's' : ''} · ${loyalty.tier.perk}`
            : loyalty.tier.perk}
        </p>
      </div>

      {/* progress to next tier */}
      {loyalty.nextTier && (
        <div style={{ position: 'relative' }}>
          <div style={{ height: '5px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '7px' }}>
            <div
              style={{
                height: '100%', borderRadius: '4px',
                width: `${Math.max(4, Math.round(loyalty.progress * 100))}%`,
                background: 'linear-gradient(90deg, #E2A7B5, #C98FA0)',
                transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
            Encore <strong style={{ color: '#E2A7B5' }}>{loyalty.nextTier.missing}</strong> points avant le statut {loyalty.nextTier.label}
          </p>
        </div>
      )}

      {/* card holder */}
      <p style={{ position: 'relative', marginTop: '16px', fontFamily: 'serif', fontStyle: 'italic', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
        {clientName}
      </p>
    </div>
  )
}
