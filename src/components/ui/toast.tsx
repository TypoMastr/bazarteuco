'use client'
import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  toast: (opts: { type: ToastType; title: string; description?: string; duration?: number }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'border-l-[#10B981] bg-white text-[#0f172a] shadow-xl shadow-[#10B981]/10',
  error: 'border-l-[#EF4444] bg-white text-[#0f172a] shadow-xl shadow-[#EF4444]/10',
  warning: 'border-l-[#F59E0B] bg-white text-[#0f172a] shadow-xl shadow-[#F59E0B]/10',
  info: 'border-l-[#3B82F6] bg-white text-[#0f172a] shadow-xl shadow-[#3B82F6]/10',
}

const iconColorMap: Record<ToastType, string> = {
  success: 'text-[#10B981]',
  error: 'text-[#EF4444]',
  warning: 'text-[#F59E0B]',
  info: 'text-[#3B82F6]',
}

const bgColorMap: Record<ToastType, string> = {
  success: 'bg-[#D1FAE5]',
  error: 'bg-[#FEE2E2]',
  warning: 'bg-[#FEF3C7]',
  info: 'bg-[#DBEAFE]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((opts: { type: ToastType; title: string; description?: string; duration?: number }) => {
    const id = Math.random().toString(36).slice(2)
    const duration = opts.duration ?? 4000
    setToasts((prev) => [...prev, { id, ...opts }])
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    }
  }, [dismiss])

  const success = useCallback((title: string, description?: string) => toast({ type: 'success', title, description }), [toast])
  const error = useCallback((title: string, description?: string) => toast({ type: 'error', title, description }), [toast])
  const warning = useCallback((title: string, description?: string) => toast({ type: 'warning', title, description }), [toast])
  const info = useCallback((title: string, description?: string) => toast({ type: 'info', title, description }), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const Icon = iconMap[t.type]
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto rounded-2xl border border-[#DEE2E6] border-l-4 p-4 shadow-lg animate-slide-in-right',
                colorMap[t.type]
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-1.5 rounded-lg shrink-0', bgColorMap[t.type])}>
                  <Icon className={cn('h-4 w-4 shrink-0', iconColorMap[t.type])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0f172a]">{t.title}</p>
                  {t.description && <p className="text-sm text-[#64748B] mt-0.5">{t.description}</p>}
                </div>
                <button 
                  onClick={() => dismiss(t.id)} 
                  className="shrink-0 p-1 rounded-lg hover:bg-[#F5F7FA] text-[#64748B] hover:text-[#0f172a] transition-colors" 
                  aria-label="Fechar notificação"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
