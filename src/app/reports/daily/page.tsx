'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  RefreshCw, AlertCircle,
  Loader2, Package,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp,
  Banknote
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ExportModal } from '@/components/export-modal'
import { PageHeader } from '@/components/page-header'
import { matchesGiraDaMata, matchesEventos, calculateCategoryRevenue, hasCategoryProducts } from '@/lib/report-categories'
import { useSalesStream } from '@/hooks/use-sales-stream'
import { Wifi, WifiOff, WifiLow } from 'lucide-react'

const ITEM_FETCH_CONCURRENCY = 4

interface ProductData { name: string; quantity: number; unitPrice: number; total: number; isRifa?: boolean; isAvulso?: boolean; isDoacao?: boolean }
interface ReportData {
  date: string
  products: ProductData[]
  summary: { 
    totalSales: number; 
    totalRevenue: number; 
    totalDiscount: number; 
    rifaRevenue: number; 
    bazarRevenue: number; 
    avulsoRevenue: number; 
    doacaoRevenue: number 
  }
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`
}
function todayBR() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateForDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split('-'); 
  return `${d}/${m}/${y}`
}

export default function DailyReportPage() {
  const toast = useToast()
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayBR())
  const [loadingReport, setLoadingReport] = useState(true)
  const [sortField, setSortField] = useState<'quantity' | 'total'>('quantity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const fetchLatest = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/reports/latest', { cache: 'no-store' })
      const data = await res.json()
      if (data.latestDate) {
        setSelectedDate(data.latestDate)
        return data.latestDate
      }
    } catch { }
    return null
  }, [])

  const fetchReport = useCallback(async (date: string) => {
    setLoadingReport(true); setError(null); setReport(null)
    try {
      const res = await fetch(`/api/reports/mysql?type=daily&date=${date}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Erro ao carregar relatório')
      const data = await res.json()
      setReport(data)
    } catch { setError('Erro ao carregar relatório') }
    finally { setLoadingReport(false) }
  }, [])

  useEffect(() => {
    fetchLatest().then((date) => { if (date) fetchReport(date) })
  }, [fetchLatest, fetchReport])

  function handleGenerate() { fetchReport(selectedDate) }
  
  function reloadAll() {
    setLoadingReport(true)
    setReport(null)
    setError(null)
    fetchLatest().then((date) => { 
      if (date) {
        setSelectedDate(date)
        fetchReport(date)
      }
      toast.success('Atualizado')
    })
  }
  function toggleSort(field: 'quantity' | 'total') {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortedProducts = useMemo(() => {
    if (!report) return []
    return [...report.products].sort((a, b) => (a[sortField] - b[sortField]) * (sortDir === 'desc' ? -1 : 1))
  }, [report, sortField, sortDir])

  const giraDaMataRevenue = useMemo(() => {
    if (!report) return 0
    return calculateCategoryRevenue(report.products, matchesGiraDaMata)
  }, [report])

  const eventosRevenue = useMemo(() => {
    if (!report) return 0
    return calculateCategoryRevenue(report.products, matchesEventos)
  }, [report])

  const correctedBazarRevenue = useMemo(() => {
    if (!report) return 0
    return report.summary.bazarRevenue - giraDaMataRevenue - eventosRevenue
  }, [report])

  const showGiraDaMata = useMemo(() => {
    if (!report) return false
    return hasCategoryProducts(report.products, matchesGiraDaMata)
  }, [report])

  const showEventos = useMemo(() => {
    if (!report) return false
    return hasCategoryProducts(report.products, matchesEventos)
  }, [report])

  const isToday = selectedDate === todayBR()
  const hasSalesToday = isToday && !!report && report.summary.totalSales > 0

  // Real-time sync
  const handleNewSale = useCallback(() => {
    if (selectedDate) fetchReport(selectedDate)
  }, [selectedDate, fetchReport])

  const { status: streamStatus, isInitialSync } = useSalesStream({
    enabled: isToday,
    hasSalesToday,
    onNewSale: handleNewSale,
    onRefresh: handleNewSale,
  })

  function SortIcon({ field }: { field: 'quantity' | 'total' }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 inline ml-1 opacity-40" />
    return sortDir === 'desc'
      ? <ArrowDown className="h-3 w-3 inline ml-1 text-[var(--teuco-green)]" />
      : <ArrowUp className="h-3 w-3 inline ml-1 text-[var(--teuco-green)]" />
  }

  if ((loadingReport && !report) || (isInitialSync && !report)) {
    return (
      <div className="p-4 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-10 bg-black/5 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
        </div>
        <div className="h-64 bg-black/5 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">

      <PageHeader
        title="Relatório Diário"
        subtitle={report ? formatDateBR(report.date) : undefined}
        backLink="/reports"
        actions={
          <>
            {report && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-bold uppercase">
                {streamStatus === 'connected' ? (
                  <Wifi className="h-3.5 w-3.5 text-[var(--teuco-green)]" />
                ) : streamStatus === 'reconnecting' ? (
                  <WifiLow className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className={streamStatus === 'connected' ? 'text-[var(--teuco-green)]' : streamStatus === 'reconnecting' ? 'text-amber-500' : 'text-red-500'}>
                  {streamStatus === 'connected' ? 'Ao vivo' : streamStatus === 'reconnecting' ? 'Conectando...' : 'Offline'}
                </span>
              </div>
            )}
            {report && <ExportModal type="report" data={report} sortedProducts={sortedProducts} extraData={{ correctedBazarRevenue, giraDaMataRevenue, eventosRevenue, showGiraDaMata, showEventos, sortField, sortDir }} />}
            <Button variant="tonal" onClick={reloadAll} className="h-9 px-3 text-xs">
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          </>
        }
      />

      {/* Date Selector - Simple and universal */}
      <div className="flex items-center justify-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            fetchReport(e.target.value)
          }}
          className="px-4 py-3 bg-white rounded-lg border border-gray-200 shadow-sm text-base font-medium cursor-pointer hover:border-[var(--teuco-green)] transition-colors"
          style={{ colorScheme: 'light' }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold text-red-600">{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Summary Cards - Vertical for mobile */}
          <div className="space-y-2">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-[var(--teuco-green)]">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total</p>
              <p className="text-xl font-black text-[var(--teuco-green)]">{formatCurrency(report.summary.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Bazar</p>
              <p className="text-xl font-black text-gray-900">{formatCurrency(correctedBazarRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-500">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rifa</p>
              <p className="text-xl font-black text-gray-900">{formatCurrency(report.summary.rifaRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Avulsos</p>
              <p className="text-xl font-black text-gray-900">{formatCurrency(report.summary.avulsoRevenue)}</p>
            </div>
            {showGiraDaMata && (
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-amber-500">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Gira da Mata</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(giraDaMataRevenue)}</p>
              </div>
            )}
            {showEventos && (
              <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-teal-500">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Eventos/Cantina</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(eventosRevenue)}</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-pink-500">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Doações</p>
              <p className="text-xl font-black text-gray-900">{formatCurrency(report.summary.doacaoRevenue)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Vendas</p>
              <p className="text-xl font-black text-gray-900">{report.summary.totalSales}</p>
            </div>
          </div>

          {/* Products Header with Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--teuco-green)]" />
              <span className="text-sm font-bold text-[var(--teuco-text)] uppercase">Mais Vendidos</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant={sortField === 'quantity' ? 'filled' : 'ghost'}
                size="sm"
                onClick={() => toggleSort('quantity')}
                className="h-7 px-2 text-[10px]"
              >
                QTD <SortIcon field="quantity" />
              </Button>
              <Button
                variant={sortField === 'total' ? 'filled' : 'ghost'}
                size="sm"
                onClick={() => toggleSort('total')}
                className="h-7 px-2 text-[10px]"
              >
                R$ <SortIcon field="total" />
              </Button>
            </div>
          </div>

          {/* Products List - Compact with highlighted values */}
          <div className="space-y-2 bg-white rounded-lg p-2 shadow-sm">
            {sortedProducts.map((product, i) => (
              <div key={product.name} className="p-2 flex flex-col gap-1 border-b border-black/[0.05] last:border-0">
                {/* Rank + Name in same line */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[var(--teuco-green)] text-white shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm font-black text-[var(--teuco-text)] uppercase flex-1">
                    {product.name}
                  </span>
                  {product.isRifa && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">RIFA</Badge>
                  )}
                </div>
                
                {/* Stats row */}
                <div className="flex items-center justify-between pl-7">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-bold text-[var(--teuco-green)] text-xs">
                      <Package className="h-3 w-3" />
                      {product.quantity}x
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--teuco-text-muted)]">
                      <Banknote className="h-3 w-3" />
                      {formatCurrency(product.unitPrice)}
                    </span>
                  </div>
                  <span className="text-sm font-black text-[var(--teuco-green)]">
                    {formatCurrency(product.total)}
                  </span>
                </div>
              </div>
            ))}

            {sortedProducts.length === 0 && (
              <div className="text-center py-12 text-[var(--teuco-text-muted)]">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase">Nenhum produto vendido</p>
              </div>
            )}
          </div>

          {/* Footer Summary */}
          <div className="bg-[var(--teuco-green)] text-white rounded-lg p-4 text-center">
            <p className="text-xs font-bold uppercase opacity-70">Resumo do Dia</p>
            <p className="text-2xl font-black mt-1">{report.summary.totalSales} venda(s)</p>
            <p className="text-lg font-black opacity-80">{formatCurrency(report.summary.totalRevenue)}</p>
          </div>
        </div>
      )}

    </div>
  )
}
