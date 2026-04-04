'use client'
import { usePathname } from 'next/navigation'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'

const publicPaths = ['/login']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = publicPaths.includes(pathname)

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex flex-col min-h-screen">
          <main className={`flex-1 focus:outline-none ${isPublicPage ? '' : 'pb-20 lg:pb-14 lg:pl-56'}`}>
            {children}
          </main>
          {!isPublicPage && <BottomNav />}
          {!isPublicPage && <Sidebar />}
        </div>
      </ToastProvider>
    </ThemeProvider>
  )
}
