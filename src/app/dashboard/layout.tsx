'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, LogOut, Package, ShoppingBag, BarChart2, FileText, Receipt, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PendingBadge from '@/components/dashboard/PendingBadge'
import LowStockBadge from '@/components/dashboard/LowStockBadge'

const navItems = [
  { href: '/dashboard/calendar',              label: 'Calendrier',        icon: Calendar,    badge: 'pending' as const },
  { href: '/dashboard/appointments/new',      label: 'Nouveau RDV',       icon: Plus,        badge: null },
  { href: '/dashboard/staff',                 label: 'Staff',             icon: Users,       badge: null },
  { href: '/dashboard/services',              label: 'Prestations',       icon: Scissors,    badge: null },
  { href: '/dashboard/products',              label: 'Produits',          icon: Package,     badge: 'lowstock' as const },
  { href: '/dashboard/ventes/new',            label: 'Ventes',            icon: ShoppingBag, badge: null },
  { href: '/dashboard/ventes/historique',     label: 'Historique ventes', icon: BarChart2,   badge: null },
  { href: '/dashboard/devis',                 label: 'Devis',             icon: FileText,    badge: null },
  { href: '/dashboard/factures',              label: 'Factures',          icon: Receipt,     badge: null },
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
    <div className="min-h-screen bg-salon-cream-light">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`peer group fixed left-0 top-0 h-full z-40
                         w-16 hover:w-52
                         transition-all duration-300 ease-in-out
                         bg-gradient-to-b from-salon-dark to-salon-sidebar-bottom
                         flex flex-col
                         overflow-hidden
                         ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Logo mark */}
        <div className="flex items-center gap-3 px-3 pt-4 pb-5 w-full">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center
                          bg-gradient-to-br from-salon-pink to-salon-gold">
            <span className="font-serif italic text-white text-sm font-semibold">BS</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <p className="font-serif italic text-salon-pink text-xs leading-tight">Brazilian Studio</p>
            <p className="text-salon-pink/50 text-[9px] tracking-widest">RABAT ✦</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 w-full px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={label}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                            transition-all duration-150
                            ${active
                              ? 'bg-white/15 text-white'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap overflow-hidden
                                 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {label}
                </span>
                {badge === 'pending' && <PendingBadge />}
                {badge === 'lowstock' && <LowStockBadge />}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="w-full px-2 pb-4">
          <button
            onClick={handleLogout}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                       text-white/40 hover:bg-white/10 hover:text-white/70
                       transition-all duration-150">
            <LogOut size={18} className="flex-shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap overflow-hidden
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* Hamburger button (mobile only) */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-salon-dark text-white rounded-lg p-2 shadow-card"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu">
        <Menu size={18} />
      </button>

      <main className="ml-16 peer-hover:ml-52 transition-all duration-300 ease-in-out
                       min-h-screen bg-salon-cream-light p-6">
        {children}
      </main>
    </div>
  )
}
