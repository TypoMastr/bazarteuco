'use client'
import { Check, Loader2, CloudDownload } from 'lucide-react'

interface SyncCatchUpModalProps {
  open: boolean
  progress: number
  message: string
  onComplete: () => void
}

export function SyncCatchUpModal({ open, progress, message, onComplete }: SyncCatchUpModalProps) {
  if (!open) return null

  const isComplete = progress >= 100

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'slideUp 0.3s ease' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)] p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
            {isComplete ? (
              <Check className="h-8 w-8 text-white" />
            ) : (
              <CloudDownload className="h-8 w-8 text-white" />
            )}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {isComplete ? 'Dados Atualizados!' : 'Sincronizando Dados'}
          </h2>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mt-1">
            {isComplete ? 'Tudo pronto para usar' : 'Aguarde um momento...'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Step indicators */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${progress >= 10 ? 'bg-[var(--teuco-green)] text-white' : 'bg-gray-100 text-gray-300'}`}>
                {progress >= 10 ? (progress >= 100 ? <Check className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />) : <CloudDownload className="h-4 w-4" />}
              </div>
              <p className={`text-sm font-bold uppercase ${progress >= 10 ? 'text-[var(--teuco-text)]' : 'text-gray-300'}`}>
                Buscando vendas do sistema
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${progress >= 70 ? 'bg-[var(--teuco-green)] text-white' : 'bg-gray-100 text-gray-300'}`}>
                {progress >= 70 ? (progress >= 100 ? <Check className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />) : <CloudDownload className="h-4 w-4" />}
              </div>
              <p className={`text-sm font-bold uppercase ${progress >= 70 ? 'text-[var(--teuco-text)]' : 'text-gray-300'}`}>
                Atualizando estoque
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${progress >= 100 ? 'bg-[var(--teuco-green)] text-white' : 'bg-gray-100 text-gray-300'}`}>
                {progress >= 100 ? <Check className="h-4 w-4" /> : <CloudDownload className="h-4 w-4" />}
              </div>
              <p className={`text-sm font-bold uppercase ${progress >= 100 ? 'text-[var(--teuco-green)]' : 'text-gray-300'}`}>
                Concluído
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pt-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase tracking-wider text-center mt-2">
              {message}
            </p>
          </div>

          {/* OK Button */}
          {isComplete && (
            <button
              onClick={onComplete}
              className="w-full h-14 rounded-xl bg-[var(--teuco-green)] text-white font-black text-sm uppercase tracking-[3px] hover:bg-[var(--teuco-green)]/90 transition-colors shadow-lg shadow-[var(--teuco-green)]/30"
            >
              OK
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
