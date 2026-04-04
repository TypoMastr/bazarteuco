'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Send, FileText, ChevronDown } from 'lucide-react'
import { exportToPDF, exportToWhatsApp, ExportType, ProductData, StockData, SaleData, ReportData } from '@/lib/export-utils'

type ExportData = ProductData[] | StockData[] | SaleData[] | ReportData

interface ExportButtonProps {
  type: ExportType
  data: ExportData
}

export function ExportButton({ type, data }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  function handlePDF() {
    exportToPDF(type, data)
    setOpen(false)
  }

  function handleWhatsApp() {
    exportToWhatsApp(type, data)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="h-9 px-4 text-xs"
        onClick={() => setOpen(!open)}
      >
        <Download className="h-4 w-4 mr-1" />
        Exportar
        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
            <button
              onClick={handlePDF}
              className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </button>
            <button
              onClick={handleWhatsApp}
              className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
            >
              <Send className="h-4 w-4" />
              Enviar WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  )
}
