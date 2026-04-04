import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  backLink?: string
  className?: string
}

export function PageHeader({ title, subtitle, actions, backLink, className = '' }: PageHeaderProps) {
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
    <div className={`border-b border-black/[0.05] pb-4 mb-4 ${className}`}>
      {/* Top row: back (left), title (center), logout (right) */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Left: back button */}
        <div className="flex items-center shrink-0 w-10 lg:w-0 lg:invisible">
          {backLink && (
            <a href={backLink}>
              <button className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 text-[var(--teuco-green)] transition-all flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            </a>
          )}
        </div>

        {/* Center: title + subtitle */}
        <div className="flex-1 flex flex-col items-center min-w-0">
          <h1 className="text-lg font-black tracking-tight text-[var(--teuco-green)] uppercase truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-[var(--teuco-text-muted)] truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: logout button on mobile, invisible spacer on desktop */}
        <div className="flex items-center justify-end shrink-0 w-10 lg:w-0 lg:invisible">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[11px] font-bold text-red-500">Sair</span>
          </button>
        </div>
      </div>

      {/* Actions row - wrap on mobile, right-aligned on desktop */}
      {actions && (
        <div className="flex items-center justify-center md:justify-end gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
