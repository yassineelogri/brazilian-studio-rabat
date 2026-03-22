'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, LogOut, Package, ShoppingBag, FileText, Receipt, Menu, X, Home } from 'lucide-react'
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    setMobileOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#141210' }}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`peer group fixed left-0 top-0 h-full z-40
                     w-[68px] hover:w-56
                     transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                     flex flex-col overflow-hidden
                     ${mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full md:translate-x-0'}`}
        style={{
          background: 'linear-gradient(180deg, #1E1A16 0%, #161310 50%, #121010 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 pt-6 pb-6 w-full">
          <div
            className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, rgba(201,169,110,0.2), rgba(201,169,110,0.08))',
              border: '1px solid rgba(201,169,110,0.3)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: 'serif',
                fontStyle: 'italic',
                fontSize: '14px',
                fontWeight: 600,
                color: '#C9A96E',
                letterSpacing: '0.05em',
                textShadow: '0 0 20px rgba(201,169,110,0.3)',
              }}
            >
              BS
            </span>
          </div>
          <div className="w-0 max-w-0 group-hover:w-auto group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
            <p style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '13px', color: '#C9A96E', lineHeight: 1.2 }}>
              Brazilian Studio
            </p>
            <p style={{ fontSize: '9px', letterSpacing: '0.25em', color: 'rgba(201,169,110,0.4)', textTransform: 'uppercase' }}>
              Rabat
            </p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 w-full px-2 overflow-hidden">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {/* Section label */}
              <div className="px-3 pt-4 pb-1.5 w-0 max-w-0 group-hover:w-auto group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-200 overflow-hidden whitespace-nowrap">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 500, color: 'rgba(201,169,110,0.35)' }}>
                  {group.label}
                </p>
              </div>

              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <div key={href} style={{ position: 'relative' }}>
                    {/* Active indicator — gold bar */}
                    {active && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '20px',
                          width: '3px',
                          borderRadius: '0 4px 4px 0',
                          background: 'linear-gradient(180deg, #C9A96E, #B8944F)',
                          boxShadow: '0 0 8px rgba(201,169,110,0.4)',
                        }}
                      />
                    )}
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      title={label}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150"
                      style={{
                        marginBottom: '2px',
                        background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
                        color: active ? '#C9A96E' : 'rgba(255,255,255,0.45)',
                        border: active ? '1px solid rgba(201,169,110,0.15)' : '1px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                        }
                      }}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="text-xs font-medium whitespace-nowrap overflow-hidden
                                       w-0 max-w-0 group-hover:w-auto group-hover:max-w-xs
                                       opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {label}
                      </span>
                      {badge === 'pending' && <PendingBadge />}
                      {badge === 'lowstock' && <LowStockBadge />}
                    </Link>
                  </div>
                )
              })}

              {/* Separator */}
              {gi < navGroups.length - 1 && (
                <div style={{ margin: '6px 12px', height: '1px', background: 'rgba(255,255,255,0.04)' }} />
              )}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="w-full px-2 pb-5">
          <div style={{ margin: '0 12px 8px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.15), transparent)' }} />
          <button
            onClick={handleLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.25)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap overflow-hidden
                             w-0 max-w-0 group-hover:w-auto group-hover:max-w-xs
                             opacity-0 group-hover:opacity-100 transition-all duration-200">
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden rounded-xl p-2.5"
        style={{
          background: mobileOpen ? 'transparent' : 'rgba(201,169,110,0.15)',
          border: mobileOpen ? 'none' : '1px solid rgba(201,169,110,0.2)',
          color: '#C9A96E',
          boxShadow: mobileOpen ? 'none' : '0 4px 16px rgba(0,0,0,0.4)',
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Main content ── */}
      <main
        className="ml-0 md:ml-[68px] md:peer-hover:ml-56 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] min-h-screen p-4 md:p-6 pt-16 md:pt-6"
        style={{ background: '#141210' }}
      >
        {children}
      </main>
    </div>
  )
}
