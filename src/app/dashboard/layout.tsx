'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, LogOut, Package, ShoppingBag, FileText, Receipt, Home, ChevronUp, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PendingBadge from '@/components/dashboard/PendingBadge'
import LowStockBadge from '@/components/dashboard/LowStockBadge'

const navGroups = [
  {
    label: 'Agenda',
    items: [
      { href: '/dashboard', label: 'Accueil', icon: Home, badge: null },
      { href: '/dashboard/calendar', label: 'Calendrier', icon: Calendar, badge: 'pending' as const },
      { href: '/dashboard/appointments/new', label: 'Nouveau RDV', icon: Plus, badge: null },
    ]
  },
  {
    label: 'Commerce',
    items: [
      { href: '/dashboard/ventes/new', label: 'Ventes', icon: ShoppingBag, badge: null },
      { href: '/dashboard/devis', label: 'Devis', icon: FileText, badge: null },
      { href: '/dashboard/factures', label: 'Factures', icon: Receipt, badge: null },
    ]
  },
  {
    label: 'Gestion',
    items: [
      { href: '/dashboard/products', label: 'Produits', icon: Package, badge: 'lowstock' as const },
      { href: '/dashboard/services', label: 'Prestations', icon: Scissors, badge: null },
      { href: '/dashboard/staff', label: 'Staff', icon: Users, badge: null },
    ]
  },
]

// Bottom tab bar items (mobile)
const bottomTabs = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/dashboard/calendar', label: 'Agenda', icon: Calendar },
  { href: '/dashboard/appointments/new', label: 'RDV', icon: Plus, highlight: true },
  { href: '/dashboard/devis', label: 'Devis', icon: FileText },
  { href: '/dashboard/factures', label: 'Factures', icon: Receipt },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleLogout() {
    setMoreOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const allSecondaryItems = [
    { href: '/dashboard/ventes/new', label: 'Ventes', icon: ShoppingBag, badge: null },
    { href: '/dashboard/products', label: 'Produits', icon: Package, badge: 'lowstock' as const },
    { href: '/dashboard/services', label: 'Prestations', icon: Scissors, badge: null },
    { href: '/dashboard/staff', label: 'Staff', icon: Users, badge: null },
  ]

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .dash-main { margin-left: 68px; padding: 32px; padding-bottom: 32px; }
          .dash-sidebar:hover ~ .dash-main { margin-left: 224px; }
          .mobile-bottom-bar { display: none !important; }
          .more-sheet { display: none !important; }
        }
        @media (max-width: 767px) {
          .dash-sidebar { display: none !important; }
          .dash-main { margin-left: 0 !important; padding: 20px 16px 88px !important; }
        }
        .nav-link-label {
          width: 0; max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
          transition: all 0.2s;
        }
        .dash-sidebar:hover .nav-link-label {
          width: auto; max-width: 200px; opacity: 1;
        }
        .sidebar-text {
          width: 0; max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
          transition: all 0.2s;
        }
        .dash-sidebar:hover .sidebar-text {
          width: auto; max-width: 200px; opacity: 1;
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#141210' }}>

        {/* ── Desktop Sidebar ── */}
        <aside
          className="dash-sidebar"
          style={{
            position: 'fixed', left: 0, top: 0, height: '100%', zIndex: 40,
            width: '68px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, #1E1A16 0%, #161310 50%, #121010 100%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
            transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.width = '224px' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.width = '68px' }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 14px', width: '100%' }}>
            <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(201,169,110,0.2), rgba(201,169,110,0.08))', border: '1px solid rgba(201,169,110,0.3)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.3)' }}>
              <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '14px', fontWeight: 600, color: '#C9A96E', letterSpacing: '0.05em' }}>BS</span>
            </div>
            <div className="sidebar-text">
              <p style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '13px', color: '#C9A96E', lineHeight: 1.2 }}>Brazilian Studio</p>
              <p style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,169,110,0.4)', textTransform: 'uppercase' }}>Rabat</p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, width: '100%', padding: '0 8px', overflow: 'hidden' }}>
            {navGroups.map((group, gi) => (
              <div key={group.label}>
                <div style={{ padding: '16px 12px 6px' }}>
                  <p className="sidebar-text" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 500, color: 'rgba(201,169,110,0.35)' }}>{group.label}</p>
                </div>
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <div key={href} style={{ position: 'relative' }}>
                      {active && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '20px', width: '3px', borderRadius: '0 4px 4px 0', background: 'linear-gradient(180deg, #C9A96E, #B8944F)', boxShadow: '0 0 8px rgba(201,169,110,0.4)' }} />}
                      <Link href={href} title={label}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '8px 10px', borderRadius: '12px', marginBottom: '2px', textDecoration: 'none', background: active ? 'rgba(201,169,110,0.1)' : 'transparent', color: active ? '#C9A96E' : 'rgba(255,255,255,0.45)', border: active ? '1px solid rgba(201,169,110,0.15)' : '1px solid transparent', transition: 'all 0.15s' }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' } }}
                      >
                        <Icon size={18} style={{ flexShrink: 0 }} />
                        <span className="nav-link-label" style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
                        {badge === 'pending' && <PendingBadge />}
                        {badge === 'lowstock' && <LowStockBadge />}
                      </Link>
                    </div>
                  )
                })}
                {gi < navGroups.length - 1 && <div style={{ margin: '6px 12px', height: '1px', background: 'rgba(255,255,255,0.04)' }} />}
              </div>
            ))}
          </nav>

          {/* Logout */}
          <div style={{ width: '100%', padding: '0 8px 20px' }}>
            <div style={{ margin: '0 12px 8px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.15), transparent)' }} />
            <button onClick={handleLogout} title="Déconnexion"
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '8px 10px', borderRadius: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)' }}
            >
              <LogOut size={18} style={{ flexShrink: 0 }} />
              <span className="nav-link-label" style={{ fontSize: '13px', fontWeight: 500 }}>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="dash-main" style={{ minHeight: '100vh', background: '#141210', transition: 'margin-left 0.3s' }}>
          {children}
        </main>

        {/* ── Mobile: More sheet backdrop ── */}
        {moreOpen && (
          <div className="more-sheet" onClick={() => setMoreOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
        )}

        {/* ── Mobile: More sheet ── */}
        {moreOpen && (
          <div className="more-sheet" style={{ position: 'fixed', bottom: '72px', left: 0, right: 0, zIndex: 50, background: '#1C1816', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', padding: '16px 16px 8px', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Plus</p>
              <button onClick={() => setMoreOpen(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {allSecondaryItems.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', textDecoration: 'none', background: active ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(201,169,110,0.2)' : '1px solid rgba(255,255,255,0.06)', color: active ? '#C9A96E' : 'rgba(255,255,255,0.75)' }}>
                    <Icon size={16} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
                    {badge === 'lowstock' && <LowStockBadge />}
                  </Link>
                )
              })}
            </div>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'rgba(248,113,113,0.8)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        )}

        {/* ── Mobile: Bottom tab bar ── */}
        <nav className="mobile-bottom-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: '#1C1816', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', height: '64px', paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 24px rgba(0,0,0,0.3)' }}>
          {bottomTabs.map(({ href, label, icon: Icon, highlight }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            if (highlight) {
              return (
                <Link key={href} href={href}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #C9A96E, #B8944F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(201,169,110,0.35)', marginTop: '-16px' }}>
                    <Icon size={20} style={{ color: '#1A1410' }} />
                  </div>
                </Link>
              )
            }
            return (
              <Link key={href} href={href}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none', color: active ? '#C9A96E' : 'rgba(255,255,255,0.35)', paddingTop: '6px' }}>
                <Icon size={20} />
                <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
              </Link>
            )
          })}
          {/* More button */}
          <button onClick={() => setMoreOpen(o => !o)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', color: moreOpen ? '#C9A96E' : 'rgba(255,255,255,0.35)', paddingTop: '6px' }}>
            <ChevronUp size={20} style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Plus</span>
          </button>
        </nav>
      </div>
    </>
  )
}
