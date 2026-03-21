'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Plus, Users, Scissors, LogOut, Package, ShoppingBag, BarChart2, FileText, Receipt } from 'lucide-react'
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-salon-cream flex">
      <aside className="w-56 bg-white border-r border-salon-rose/20 flex flex-col py-6 px-3 fixed inset-y-0 left-0 z-10">
        <div className="px-3 mb-8">
          <h1 className="text-base font-semibold text-salon-dark">Brazilian Studio</h1>
          <p className="text-xs text-salon-muted">Dashboard</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-salon-pink text-salon-dark'
                    : 'text-salon-muted hover:bg-salon-cream hover:text-salon-dark'
                }`}
              >
                <Icon size={16} />
                {label}
                {badge === 'pending' && <PendingBadge />}
                {badge === 'lowstock' && <LowStockBadge />}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-salon-muted hover:text-red-500 hover:bg-red-50 transition"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </aside>

      <main className="flex-1 ml-56 p-6">
        {children}
      </main>
    </div>
  )
}
