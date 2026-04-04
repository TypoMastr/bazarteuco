'use client'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface PageHeaderProps {
  subtitle?: string
}

const pageConfig: Record<string, { title: string; getSubtitle?: () => string }> = {
  '/sales': { title: 'Vendas do Dia', getSubtitle: () => new Date().toLocaleDateString('pt-BR') },
  '/products': { title: 'Produtos' },
  '/products/stock': { title: 'Estoque' },
  '/reports': { title: 'Relatórios' },
}

export function PageHeader({ subtitle }: PageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  const config = pageConfig[pathname] || { title: 'Bazar TEUCO' }
  const displaySubtitle = subtitle || (config.getSubtitle ? config.getSubtitle() : '')

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white shadow-sm">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-2">
          <Link href="/sales" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teuco-green)] text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-black text-[var(--teuco-text)] uppercase leading-tight">
              {config.title}
            </span>
            {displaySubtitle && (
              <span className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase">
                {displaySubtitle}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide text-red-500 hover:bg-red-50 transition-colors lg:hidden"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  )
}
