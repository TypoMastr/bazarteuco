'use client'
import { useState, useEffect } from 'react'
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SyncStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  detail?: string
}

interface SyncProgressModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export function SyncProgressModal({ open, onClose, onComplete }: SyncProgressModalProps) {
  const [steps, setSteps] = useState<SyncStep[]>([
    { id: 'fetch', label: 'Buscando dados do SmartPOS', status: 'pending' },
    { id: 'products', label: 'Sincronizando produtos', status: 'pending' },
    { id: 'stock', label: 'Atualizando estoque', status: 'pending' },
    { id: 'done', label: 'Concluído', status: 'pending' },
  ])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setSteps([
      { id: 'fetch', label: 'Buscando dados do SmartPOS', status: 'pending' },
      { id: 'products', label: 'Sincronizando produtos', status: 'pending' },
      { id: 'stock', label: 'Atualizando estoque', status: 'pending' },
      { id: 'done', label: 'Concluído', status: 'pending' },
    ])

    async function runSync() {
      try {
        // Step 1: Fetch products
        setSteps(s => s.map(step => step.id === 'fetch' ? { ...step, status: 'loading' } : step))
        
        const res = await fetch('/api/stock/sync', { method: 'POST' })
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao sincronizar')
        }

        setSteps(s => s.map(step => step.id === 'fetch' ? { ...step, status: 'done', detail: `${data.synced} produtos` } : step))
        
        // Step 2: Products synced
        setSteps(s => s.map(step => step.id === 'products' ? { ...step, status: 'done', detail: `${data.synced} sincronizados` } : step))
        
        // Step 3: Stock updated
        setSteps(s => s.map(step => step.id === 'stock' ? { ...step, status: 'done', detail: 'Estoque atualizado' } : step))
        
        // Done
        setSteps(s => s.map(step => step.id === 'done' ? { ...step, status: 'done' } : step))
        
        onComplete()
      } catch (err: any) {
        setError(err.message || 'Erro ao sincronizar')
        setSteps(s => s.map(step => step.status === 'loading' ? { ...step, status: 'error' } : step))
      }
    }

    runSync()
  }, [open, onComplete])

  if (!open) return null

  const allDone = steps.every(s => s.status === 'done')
  const progress = Math.round((steps.filter(s => s.status === 'done').length / steps.length) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
            {allDone ? (
              <Check className="h-8 w-8 text-white" />
            ) : error ? (
              <AlertCircle className="h-8 w-8 text-white" />
            ) : (
              <RefreshCw className="h-8 w-8 text-white animate-spin" />
            )}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {error ? 'Erro na Sincronização' : allDone ? 'Sincronização Concluída' : 'Sincronizando...'}
          </h2>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mt-1">
            {error ? 'Verifique sua conexão' : allDone ? 'Dados atualizados com sucesso' : 'Aguarde um momento...'}
          </p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {steps.filter(s => s.id !== 'done').map((step, idx) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                ${step.status === 'done' ? 'bg-[var(--teuco-green)] text-white' : ''}
                ${step.status === 'loading' ? 'bg-[var(--teuco-green)]/20 text-[var(--teuco-green)]' : ''}
                ${step.status === 'error' ? 'bg-red-100 text-red-500' : ''}
                ${step.status === 'pending' ? 'bg-gray-100 text-gray-300' : ''}
              `}>
                {step.status === 'done' && <Check className="h-5 w-5" />}
                {step.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
                {step.status === 'error' && <AlertCircle className="h-5 w-5" />}
                {step.status === 'pending' && <span className="text-sm font-bold">{idx + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold uppercase tracking-wide transition-colors
                  ${step.status === 'done' ? 'text-[var(--teuco-green)]' : ''}
                  ${step.status === 'loading' ? 'text-[var(--teuco-text)]' : ''}
                  ${step.status === 'error' ? 'text-red-500' : ''}
                  ${step.status === 'pending' ? 'text-gray-300' : ''}
                `}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-xs text-[var(--teuco-text-muted)]">{step.detail}</p>
                )}
              </div>
            </div>
          ))}

          {/* Progress bar */}
          <div className="pt-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase tracking-wider text-center mt-2">
              {progress}% concluído
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Buttons */}
          {(allDone || error) && (
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-[var(--teuco-green)] text-white font-black text-sm uppercase tracking-[2px] hover:bg-[var(--teuco-green)]/90 transition-colors shadow-lg shadow-[var(--teuco-green)]/30"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
