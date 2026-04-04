'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import {
  ChevronLeft, Calendar, TrendingUp, Package, Banknote,
  RefreshCw, Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { ExportModal } from '@/components/export-modal'
import { PageHeader } from '@/components/page-header'
import { matchesGiraDaMata, matchesEventos, calculateCategoryRevenue, hasCategoryProducts } from '@/lib/report-categories'

const MONTHS = [
  { num: 1, name: 'Janeiro', short: 'Jan' },
  { num: 2, name: 'Fevereiro', short: 'Fev' },
  { num: 3, name: 'Março', short: 'Mar' },
  { num: 4, name: 'Abril', short: 'Abr' },
  { num: 5, name: 'Maio', short: 'Mai' },
  { num: 6, name: 'Junho', short: 'Jun' },
  { num: 7, name: 'Julho', short: 'Jul' },
  { num: 8, name: 'Agosto', short: 'Ago' },
  { num: 9, name: 'Setembro', short: 'Set' },
  { num: 10, name: 'Outubro', short: 'Out' },
  { num: 11, name: 'Novembro', short: 'Nov' },
  { num: 12, name: 'Dezembro', short: 'Dez' },
]

interface MonthlyReport {
  year: number
  month: number
  dailyData: { date: string; total: number; sales: number }[]
  topProducts: { name: string; quantity: number; total: number; rifaRevenue: number }[]
  summary: { totalRevenue: number; bazarRevenue: number; rifaRevenue: number; avulsoRevenue: number; doacaoRevenue: number; totalSales: number }
}

export default function MonthlyReportPage() {
  const toast = useToast()
  const [step, setStep] = useState<'year' | 'month' | 'report'>('year')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(0)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [years, setYears] = useState<number[]>([])
  const [syncing, setSyncing] = useState(false)
  const [sortField, setSortField] = useState<'quantity' | 'total'>('quantity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchAvailableYears()
  }, [])

  async function fetchAvailableYears() {
    try {
      const res = await fetch('/api/reports/mysql?type=years')
      const data = await res.json()
      if (data.years && data.years.length > 0) {
        setYears(data.years)
      } else {
        setYears([new Date().getFullYear(), new Date().getFullYear() - 1])
      }
    } catch {
      setYears([new Date().getFullYear(), new Date().getFullYear() - 1])
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/sales/sync?start=2025-01-01&end=${new Date().toISOString().split('T')[0]}`)
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.synced} vendas sincronizadas`)
        await fetchAvailableYears()
      } else {
        toast.error('Erro ao sincronizar')
      }
    } catch (error) {
      console.error('[Reports] Sync error:', error)
      toast.error('Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function fetchReport(year: number, month: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/mysql?type=monthly&year=${year}&month=${month}`)
      const data = await res.json()
      if (data.summary) {
        setReport(data)
        setStep('report')
      } else {
        toast.error('Erro ao carregar relatório')
      }
    } catch {
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  function handleMonthSelect(month: number) {
    setSelectedMonth(month)
    fetchReport(selectedYear, month)
  }

  function toggleSort(field: 'quantity' | 'total') {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sortedTopProducts = useMemo(() => {
    if (!report) return []
    return [...report.topProducts].sort((a, b) => (a[sortField] - b[sortField]) * (sortDir === 'desc' ? -1 : 1))
  }, [report, sortField, sortDir])

  const giraDaMataRevenue = useMemo(() => {
    if (!report) return 0
    return calculateCategoryRevenue(report.topProducts, matchesGiraDaMata)
  }, [report])

  const eventosRevenue = useMemo(() => {
    if (!report) return 0
    return calculateCategoryRevenue(report.topProducts, matchesEventos)
  }, [report])

  const correctedBazarRevenue = useMemo(() => {
    if (!report) return 0
    return report.summary.bazarRevenue - giraDaMataRevenue - eventosRevenue
  }, [report])

  const showGiraDaMata = useMemo(() => {
    if (!report) return false
    return hasCategoryProducts(report.topProducts, matchesGiraDaMata)
  }, [report])

  const showEventos = useMemo(() => {
    if (!report) return false
    return hasCategoryProducts(report.topProducts, matchesEventos)
  }, [report])

  function formatDateBR(dateStr: string) {
    const d = new Date(dateStr)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = d.getUTCFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">
      <PageHeader
        title="Relatório Mensal"
        subtitle={step === 'report' && report ? `${MONTHS[report.month - 1].name} ${report.year}` : undefined}
        backLink="/reports"
        actions={
          <>
            {report && <ExportModal type="report" data={report} sortedProducts={sortedTopProducts} />}
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="h-9 text-xs">
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Button>
          </>
        }
      />

      {syncing && (
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          <span className="text-xs font-bold text-[var(--teuco-green)] uppercase">Sincronizando...</span>
        </div>
      )}

      {/* Step 1: Year Selection */}
      {step === 'year' && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-[var(--teuco-text)] uppercase text-center">Selecione o Ano</p>
          <div className="space-y-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => { setSelectedYear(year); setStep('month') }}
                className={cn(
                  "w-full p-4 rounded-xl border-2 bg-white text-left transition-all hover:shadow-md active:scale-95",
                  selectedYear === year ? "border-[var(--teuco-green)] bg-green-50" : "border-gray-200"
                )}
              >
                <span className="text-lg font-black text-[var(--teuco-text)]">{year}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Month Selection */}
      {step === 'month' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('year')}
              className="text-xs font-bold text-[var(--teuco-green)] hover:underline"
            >
              ← Voltar
            </button>
            <p className="text-sm font-bold text-[var(--teuco-text)] uppercase">{selectedYear}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => (
              <button
                key={month.num}
                onClick={() => handleMonthSelect(month.num)}
                disabled={loading}
                className={cn(
                  "p-4 rounded-xl border-2 bg-white text-center transition-all hover:shadow-md active:scale-95",
                  selectedMonth === month.num ? "border-[var(--teuco-green)] bg-green-50" : "border-gray-200",
                  loading && "opacity-50"
                )}
              >
                <span className="text-sm font-black text-[var(--teuco-text)] uppercase">{month.short}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--teuco-green)]" />
        </div>
      )}

      {/* Report */}
      {step === 'report' && report && (
        <div className="space-y-4">
          {/* Summary Cards - Vertical */}
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
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-pink-500">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Doações</p>
              <p className="text-xl font-black text-gray-900">{formatCurrency(report.summary.doacaoRevenue)}</p>
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
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-400">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Vendas</p>
              <p className="text-xl font-black text-gray-900">{report.summary.totalSales}</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          {report.dailyData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--teuco-green)]" />
                <span className="text-sm font-bold text-[var(--teuco-text)] uppercase">Vendas por Dia</span>
              </div>
              <div className="space-y-2 bg-white rounded-lg p-2 shadow-sm">
                {report.dailyData.map((day) => (
                  <div key={day.date} className="p-3 flex items-center justify-between border-b border-black/[0.05] last:border-0">
                    <div>
                      <p className="text-sm font-black text-[var(--teuco-text)]">{formatDateBR(day.date)}</p>
                      <p className="text-[10px] text-[var(--teuco-text-muted)]">{day.sales} venda(s)</p>
                    </div>
                    <p className="text-sm font-black text-[var(--teuco-green)]">{formatCurrency(day.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products */}
          {report.topProducts.length > 0 && (
            <div className="space-y-2">
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
                    QTD
                  </Button>
                  <Button
                    variant={sortField === 'total' ? 'filled' : 'ghost'}
                    size="sm"
                    onClick={() => toggleSort('total')}
                    className="h-7 px-2 text-[10px]"
                  >
                    R$
                  </Button>
                </div>
              </div>
              <div className="space-y-2 bg-white rounded-lg p-2 shadow-sm">
                {sortedTopProducts.map((product, i) => (
                  <div key={product.name} className="p-2 flex flex-col gap-1 border-b border-black/[0.05] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[var(--teuco-green)] text-white shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm font-black text-[var(--teuco-text)] uppercase flex-1">
                        {product.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-7">
                      <span className="text-xs font-bold text-[var(--teuco-green)] flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {product.quantity}x
                      </span>
                      <span className="text-sm font-black text-[var(--teuco-green)]">
                        {formatCurrency(product.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-[var(--teuco-green)] text-white rounded-lg p-4 text-center">
            <p className="text-xs font-bold uppercase opacity-70">Resumo do Mês</p>
            <p className="text-2xl font-black mt-1">{report.summary.totalSales} venda(s)</p>
            <p className="text-lg font-black opacity-80">{formatCurrency(report.summary.totalRevenue)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
