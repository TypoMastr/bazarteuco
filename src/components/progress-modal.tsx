'use client'
import { Check, Loader2, AlertCircle, CloudUpload, Database, FileText, Upload, ExternalLink } from 'lucide-react'

interface Step {
  id: string
  label: string
  icon: typeof CloudUpload
  status: 'pending' | 'loading' | 'done' | 'error'
}

interface ProgressModalProps {
  open: boolean
  steps: Step[]
  currentStep: string
  error: string | null
  onComplete: () => void
}

const stepIcons: Record<string, typeof CloudUpload> = {
  syncCategories: Database,
  syncProducts: Database,
  generateHTML: FileText,
  uploadFTP: Upload,
}

export function ProgressModal({ open, steps, currentStep, error, onComplete }: ProgressModalProps) {
  if (!open) return null

  const doneCount = steps.filter(s => s.status === 'done').length
  const progress = Math.round((doneCount / steps.length) * 100)
  const allDone = doneCount === steps.length && !error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'slideUp 0.3s ease' }}>
        {/* Header */}
        <div className={`p-6 text-center transition-colors ${allDone ? 'bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)]' : 'bg-gradient-to-r from-[var(--teuco-green)] to-[var(--teuco-green-light)]'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3">
            {allDone ? <Check className="h-8 w-8 text-white" /> : <CloudUpload className="h-8 w-8 text-white" />}
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {allDone ? 'Site Atualizado!' : 'Atualizando Site'}
          </h2>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider mt-1">
            {allDone ? 'Tudo foi enviado com sucesso' : 'Aguarde um momento...'}
          </p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {steps.map((step) => {
            const Icon = stepIcons[step.id] || CloudUpload
            const isActive = step.id === currentStep
            const isDone = step.status === 'done'
            const isLoading = step.status === 'loading'
            const isError = step.status === 'error'

            return (
              <div key={step.id} className="flex items-center gap-4">
                {/* Circle indicator */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                  ${isDone ? 'bg-[var(--teuco-green)] text-white' : ''}
                  ${isLoading ? 'bg-[var(--teuco-green)]/20 text-[var(--teuco-green)]' : ''}
                  ${isError ? 'bg-red-100 text-red-500' : ''}
                  ${!isActive && !isDone && !isError ? 'bg-gray-100 text-gray-300' : ''}
                `}>
                  {isDone && <Check className="h-5 w-5" />}
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {isError && <AlertCircle className="h-5 w-5" />}
                  {!isActive && !isDone && !isError && <Icon className="h-5 w-5" />}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold uppercase tracking-wide transition-colors
                    ${isDone ? 'text-[var(--teuco-green)]' : ''}
                    ${isLoading ? 'text-[var(--teuco-text)]' : ''}
                    ${isError ? 'text-red-500' : ''}
                    ${!isActive && !isDone && !isError ? 'text-gray-300' : ''}
                  `}>
                    {step.label}
                  </p>
                </div>

                {/* Status indicator */}
                {isDone && (
                  <span className="text-[10px] font-black text-[var(--teuco-green)] uppercase">Concluído</span>
                )}
              </div>
            )
          })}

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

          {/* OK + Ver Site Buttons - shown when all steps are done */}
          {allDone && (
            <div className="space-y-3">
              <a
                href="https://www.teuco.com.br/bazar/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-white text-[var(--teuco-green)] font-black text-sm uppercase tracking-[3px] border-2 border-[var(--teuco-green)] hover:bg-[var(--teuco-green)]/5 transition-colors"
              >
                <ExternalLink className="h-5 w-5" />
                Ver Site
              </a>
              <button
                onClick={onComplete}
                className="w-full h-14 rounded-xl bg-[var(--teuco-green)] text-white font-black text-sm uppercase tracking-[3px] hover:bg-[var(--teuco-green)]/90 transition-colors shadow-lg shadow-[var(--teuco-green)]/30"
              >
                OK
              </button>
            </div>
          )}

          {/* Close on error */}
          {error && (
            <button
              onClick={onComplete}
              className="w-full h-14 rounded-xl bg-red-500 text-white font-black text-sm uppercase tracking-[3px] hover:bg-red-600 transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
