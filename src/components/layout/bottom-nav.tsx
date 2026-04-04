'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/constants'
import { LogOut } from 'lucide-react'

export function BottomNav() {
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-black/[0.05] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div
          className="flex items-center justify-around min-h-16 px-1"
          style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center min-w-[56px] flex-1 h-full transition-all duration-200',
                  isActive
                    ? 'text-[var(--teuco-green)]'
                    : 'text-[var(--teuco-text)]'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-[var(--teuco-green)] text-white shadow-sm'
                    : 'bg-transparent'
                )}>
                  <item.icon className={cn(
                    "h-5 w-5",
                    isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'
                  )} />
                </div>

                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wide mt-0.5",
                  isActive ? 'opacity-100' : 'opacity-80'
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
  )
}
