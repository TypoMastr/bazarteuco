'use client'
import { ShoppingBag, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/constants'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  return (
    <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-56 bg-white z-30 flex-col border-r border-black/[0.05]">
      <div className="h-14 flex items-center px-4">
         <Link href="/sales" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teuco-green)] text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="font-black text-lg tracking-tight text-[var(--teuco-green)] uppercase">
              Bazar <span className="opacity-60">TEUCO</span>
            </span>
         </Link>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200',
                isActive
                  ? 'bg-[var(--teuco-green)] text-white'
                  : 'text-[var(--teuco-text-muted)] hover:bg-[var(--teuco-green-soft)] hover:text-[var(--teuco-green)]'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-2 mt-auto border-t border-black/[0.05]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-xs font-bold uppercase tracking-wide text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
