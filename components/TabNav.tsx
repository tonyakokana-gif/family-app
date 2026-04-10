'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Package, ShoppingCart, MessageSquare } from 'lucide-react'

const tabs = [
  { href: '/calendar', label: '予定', icon: CalendarDays },
  { href: '/inventory', label: '在庫', icon: Package },
  { href: '/shopping', label: '買い物', icon: ShoppingCart },
  { href: '/memo', label: 'メモ', icon: MessageSquare },
]

export default function TabNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[60px]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:opacity-70 ${
                active ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className="transition-transform active:scale-90"
              />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
