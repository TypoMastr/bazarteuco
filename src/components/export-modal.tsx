'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Send, FileText, X } from 'lucide-react'
import { exportToPDF, exportToWhatsApp, ExportType, ProductData, StockData, SaleData, ReportData } from '@/lib/export-utils'

type ExportData = ProductData[] | StockData[] | SaleData[] | ReportData

interface ExportModalProps {
  type: ExportType
  data: ExportData
  sortedProducts?: { name: string; quantity: number; unitPrice?: number; total: number }[]
  saleItems?: Record<string, any[]>
}

export function ExportModal({ type, data, sortedProducts, saleItems }: ExportModalProps) {
  const [open, setOpen] = useState(false)

  const getExportData = (): ExportData => {
    if (type === 'report' && sortedProducts && typeof data === 'object' && 'summary' in data) {
      return { ...data as ReportData, products: sortedProducts } as ExportData
    }
    if (type === 'sales' && saleItems) {
      return { sales: data as SaleData[], saleItems } as unknown as ExportData
    }
    return data
  }

  function handlePDF() {
    exportToPDF(type, getExportData())
    setOpen(false)
  }

  function handleWhatsApp() {
    exportToWhatsApp(type, getExportData())
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-9 px-4 text-xs"
        onClick={() => setOpen(true)}
      >
        <Download className="h-4 w-4 mr-1" />
        Exportar
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-black text-[var(--teuco-text)] uppercase text-sm">Exportar Dados</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[var(--teuco-text-muted)] mb-4">
                Escolha o formato de exportação:
              </p>
              <button
                onClick={handlePDF}
                className="w-full p-4 rounded-lg border-2 border-gray-100 hover:border-[var(--teuco-green)] hover:bg-[var(--teuco-green-soft)] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-[var(--teuco-text)]">Exportar PDF</p>
                  <p className="text-xs text-[var(--teuco-text-muted)]">Baixar arquivo para impressão</p>
                </div>
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-full p-4 rounded-lg border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-[var(--teuco-text)]">Enviar WhatsApp</p>
                  <p className="text-xs text-[var(--teuco-text-muted)]">Compartilhar via WhatsApp</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
