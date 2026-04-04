'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import {
  Search, Loader2, Calendar, X,
  ShoppingCart, Package, RefreshCw,
  Banknote, ShoppingBag
} from 'lucide-react'
import { salesCache } from '@/lib/sales-cache'
import { ExportModal } from '@/components/export-modal'
import { PageHeader } from '@/components/page-header'

const ITEM_FETCH_CONCURRENCY = 4

function todayBR() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')
}
function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

async function fetchSaleItems(uid: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/sales/${uid}/items`)
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function fetchSaleItemsBatch(uids: string[], onProgress?: (current: number, total: number) => void): Promise<Record<string, any[]>> {
  const itemsMap: Record<string, any[]> = {}
  const batches: string[][] = []
  for (let i = 0; i < uids.length; i += ITEM_FETCH_CONCURRENCY) {
    batches.push(uids.slice(i, i + ITEM_FETCH_CONCURRENCY))
  }
  let processed = 0
  for (const batch of batches) {
    const results = await Promise.all(batch.map(async (uid) => {
      const items = await fetchSaleItems(uid)
      return { uid, items }
    }))
    for (const { uid, items } of results) {
      itemsMap[uid] = items
      processed++
    }
    onProgress?.(processed, uids.length)
  }
  return itemsMap
}

async function decrementStock(items: { productId: number; quantity: number }[]): Promise<void> {
  if (items.length === 0) return
  try {
    await fetch('/api/stock/decrement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
  } catch (error) {
    console.error('[Sales] Stock decrement error:', error)
  }
}

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saleItems, setSaleItems] = useState<Record<string, any[]>>({})
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [allItemsLoaded, setAllItemsLoaded] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [newSalesCount, setNewSalesCount] = useState(0)
  const decrementedSalesRef = useRef<Set<string>>(new Set())

  const salesRef = useRef(sales)
  const saleItemsRef = useRef(saleItems)

  salesRef.current = sales
  saleItemsRef.current = saleItems

  const fetchSales = useCallback(async (start: string, end: string, append = false) => {
    if (!append) { setLoading(true); setSales([]); setSaleItems({}) }
    setError(null); setAllItemsLoaded(false); setProgress(null)
    try {
      const startISO = `${start}T00:00:00Z`
      const endISO = `${end}T23:59:59Z`
      const res = await fetch(`/api/sales?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`)
      if (!res.ok) throw new Error('Erro ao carregar vendas')
      const data = await res.json()
      const salesList = Array.isArray(data) ? data : (data.items || data.data || [])
      if (append) {
        setSales((prev) => salesCache.mergeSales(prev, salesList))
        return salesCache.mergeSales(salesRef.current, salesList)
      }
      setSales(salesList)
      return salesList
    } catch (err) { setError(String(err)); return [] }
    finally { if (!append) setLoading(false) }
  }, [])

  const fetchAllItems = useCallback(async (salesList: any[], existingItems: Record<string, any[]> = {}) => {
    const uids = salesList.map((s: any) => s.uniqueIdentifier || s.id).filter((uid: string) => !existingItems[uid])
    if (uids.length === 0) { setAllItemsLoaded(true); return existingItems }
    setLoadingItems(new Set(uids)); setProgress({ current: 0, total: uids.length })
    const itemsMap = await fetchSaleItemsBatch(uids, (current, total) => {
      setProgress({ current, total })
    })
    const merged = { ...existingItems, ...itemsMap }
    setSaleItems(merged)
    setLoadingItems(new Set()); setProgress(null); setAllItemsLoaded(true)
    return merged
  }, [])

  const handleSync = useCallback(async () => {
    const currentLatestDate = latestDate
    if (!currentLatestDate || syncing) return
    setSyncing(true); setNewSalesCount(0)
    const now = new Date().toISOString()
    const startISO = `${currentLatestDate}T00:00:00Z`
    try {
      const res = await fetch(`/api/sales?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(now)}`)
      if (res.ok) {
        const data = await res.json()
        const salesList = Array.isArray(data) ? data : (data.items || data.data || [])
        const existingIds = new Set(salesRef.current.map((s) => s.id))
        const newSales = salesList.filter((s: any) => !existingIds.has(s.id))
        const toDecrement = newSales.filter((s: any) => {
          const uid = s.uniqueIdentifier || s.id
          if (decrementedSalesRef.current.has(uid)) return false
          decrementedSalesRef.current.add(uid)
          return true
        })
        if (toDecrement.length > 0) {
          setNewSalesCount(toDecrement.length)
          setSales((prev) => salesCache.mergeSales(prev, toDecrement))
          const uids = toDecrement.map((s: any) => s.uniqueIdentifier || s.id)
          const existingItems = saleItemsRef.current
          const itemsMap = await fetchSaleItemsBatch(uids, (current, total) => {
            setProgress({ current, total })
          })
          setSaleItems({ ...existingItems, ...itemsMap })
          setLoadingItems(new Set()); setProgress(null)

          const stockUpdates: Record<number, number> = {}
          for (const sale of toDecrement) {
            const uid = sale.uniqueIdentifier || sale.id
            const items = itemsMap[uid] || []
            for (const item of items) {
              const pid = item.product?.id || item.productId
              if (pid) {
                stockUpdates[pid] = (stockUpdates[pid] || 0) + (item.quantity || 1)
              }
            }
          }
          const stockItems = Object.entries(stockUpdates).map(([productId, quantity]) => ({
            productId: parseInt(productId),
            quantity
          }))
          if (stockItems.length > 0) {
            await decrementStock(stockItems)
          }
        }
      }
    } catch (error) { console.error('[Sales] Sync error:', error) } finally { setSyncing(false); setTimeout(() => setNewSalesCount(0), 3000) }
  }, [latestDate, syncing])

  useEffect(() => { salesCache.clearOldCache() }, [])

  useEffect(() => {
    fetch('/api/reports/latest').then(r => r.json()).then(data => {
      if (!data.latestDate) { const today = todayBR(); setStartDate(today); setEndDate(today); setLoading(false); return }
      const latestDate = data.latestDate; setLatestDate(latestDate); setStartDate(latestDate); setEndDate(latestDate)
      const cached = salesCache.get(latestDate); const cachedItems = salesCache.getItems(latestDate)
      if (cached && cachedItems && Object.keys(cachedItems.data).length === cached.data.length) {
        setSales(cached.data); setSaleItems(cachedItems.data); setLoading(false); setAllItemsLoaded(true)
      } else {
        fetchSales(latestDate, latestDate).then((salesList) => {
          if (salesList.length > 0) {
            salesCache.set(latestDate, salesList, salesList[0]?.creationDate || new Date().toISOString())
            fetchAllItems(salesList).then((allItems) => {
              salesCache.setItems(latestDate, allItems, salesList[0]?.creationDate || new Date().toISOString())
            })
          } else setAllItemsLoaded(true)
        })
      }
    }).catch(() => {
      const today = todayBR(); setStartDate(today); setEndDate(today); setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined' && document.hidden) return
    const interval = setInterval(() => {
      const currentLatestDate = latestDate
      if (!currentLatestDate) return
      const now = new Date().toISOString()
      const startISO = `${currentLatestDate}T00:00:00Z`
      fetch(`/api/sales?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(now)}`)
        .then((res: any) => res.ok ? res.json() : null)
        .then((data: any) => {
          if (!data) return
          const salesList = Array.isArray(data) ? data : (data.items || data.data || [])
          const existingIds = new Set(salesRef.current.map((s) => s.id))
          const newSales = salesList.filter((s: any) => !existingIds.has(s.id))
          const toDecrement = newSales.filter((s: any) => {
            const uid = s.uniqueIdentifier || s.id
            if (decrementedSalesRef.current.has(uid)) return false
            decrementedSalesRef.current.add(uid)
            return true
          })
          if (toDecrement.length > 0) {
            setNewSalesCount(toDecrement.length)
            setSales((prev) => salesCache.mergeSales(prev, toDecrement))
            const uids = toDecrement.map((s: any) => s.uniqueIdentifier || s.id)
            const existingItems = saleItemsRef.current
            fetchSaleItemsBatch(uids).then((itemsMap) => {
              setSaleItems({ ...existingItems, ...itemsMap })
              
              const stockUpdates: Record<number, number> = {}
              for (const sale of toDecrement) {
                const uid = sale.uniqueIdentifier || sale.id
                const items = itemsMap[uid] || []
                for (const item of items) {
                  const pid = item.product?.id || item.productId
                  if (pid) {
                    stockUpdates[pid] = (stockUpdates[pid] || 0) + (item.quantity || 1)
                  }
                }
              }
              const stockItems = Object.entries(stockUpdates).map(([productId, quantity]) => ({
                productId: parseInt(productId),
                quantity
              }))
              if (stockItems.length > 0) {
                decrementStock(stockItems)
              }
            })
          }
        })
        .catch((error) => console.error('[Sales] Polling error:', error))
    }, 60000)
    
    const handleVisibilityChange = () => {
      if (document.hidden) clearInterval(interval)
    }
    document?.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document?.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [latestDate])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return sales
    return sales.filter((s: any) => {
      if ((s.orderName || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q)) return true
      const uid = s.uniqueIdentifier || s.id
      const items = saleItems[uid] || []
      return items.some((item: any) => (item.product?.name || '').toLowerCase().includes(q))
    })
  }, [sales, search, saleItems])

  const totalRevenue = useMemo(() => sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0), [sales])
  const totalItems = useMemo(() => Object.values(saleItems).reduce((sum: number, items: any[]) => sum + items.length, 0), [saleItems])

  function handleFilter() {
    fetchSales(startDate, endDate).then((salesList) => {
      if (salesList.length > 0) {
        salesCache.set(startDate, salesList, salesList[0]?.creationDate || new Date().toISOString())
        fetchAllItems(salesList).then((allItems) => {
          salesCache.setItems(startDate, allItems, salesList[0]?.creationDate || new Date().toISOString())
        })
      } else setAllItemsLoaded(true)
    })
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-12 bg-black/5 rounded-lg" />
        <div className="flex gap-4">
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
          <div className="h-16 flex-1 bg-black/5 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-black/5 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">

      <PageHeader
        title="Vendas do Dia"
        subtitle={latestDate ? formatDateBR(latestDate) : undefined}
        actions={
          <>
            <Button variant="tonal" onClick={handleSync} disabled={syncing} className="h-9 px-4">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sync' : 'Atualizar'}
            </Button>
            <ExportModal type="sales" data={sales} saleItems={saleItems} dateRange={{ start: startDate, end: endDate }} />
          </>
        }
      />

      {newSalesCount > 0 && (
        <div className="bg-[var(--teuco-green)] text-white px-4 py-2 rounded-lg flex items-center justify-between">
           <span className="text-xs font-bold uppercase">{newSalesCount} nova(s) venda(s)!</span>
           <button onClick={() => setNewSalesCount(0)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary Cards - Horizontal Compact */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-3 border-[var(--teuco-green)]">
          <p className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase mb-1">Receita</p>
          <p className="text-lg font-black text-[var(--teuco-green)] tracking-tight">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-3 border-[var(--teuco-green-light)]">
          <p className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase mb-1">Vendas</p>
          <p className="text-lg font-black text-[var(--teuco-text)]">{sales.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-3 border-blue-400">
          <p className="text-[10px] font-bold text-[var(--teuco-text-muted)] uppercase mb-1">Itens</p>
          <p className="text-lg font-black text-[var(--teuco-text)]">{totalItems}</p>
        </div>
      </div>

      {/* Filter Bar - Compact */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs" />
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs" />
        </div>
        <Button onClick={handleFilter} className="h-9 px-4 text-xs">Filtrar</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--teuco-green)] opacity-50" />
        <Input
          placeholder="Buscar venda..."
          className="pl-10 h-9 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-red-500" />
          </button>
        )}
      </div>

      {/* Sales List - Horizontal Cards */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--teuco-text-muted)] uppercase">{filtered.length} venda(s)</p>
        
        {filtered.map((sale: any) => {
          const uid = sale.uniqueIdentifier || sale.id
          const items = saleItems[uid]
          const isLoadingItems = loadingItems.has(uid)

          return (
            <div key={sale.id} className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <span className="text-base font-black text-[var(--teuco-text)] uppercase block">
                       {sale.orderName || (sale.id && /^\d+$/.test(sale.id) ? `#${sale.id}` : `Venda`)}
                    </span>
                    <span className="text-sm font-bold text-[var(--teuco-text-muted)] block">
                       {formatDate(sale.creationDate)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-[var(--teuco-text)]">
                     {formatCurrency(sale.totalAmount)}
                  </span>
                  {sale.isCanceled && <Badge variant="destructive" className="ml-2 text-[10px]">CANC</Badge>}
                </div>
              </div>

              {isLoadingItems ? (
                <div className="flex items-center gap-2 text-[10px] text-[var(--teuco-text-muted)]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                </div>
              ) : items && items.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-black/[0.05]">
                  <p className="text-[9px] font-bold text-[var(--teuco-text-muted)] uppercase mb-1.5">Itens:</p>
                  <div className="space-y-1">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-bold text-white bg-[var(--teuco-green)] px-1.5 py-0.5 rounded text-[9px] shrink-0">
                            {item.quantity}×
                          </span>
                          <span className="text-[var(--teuco-text)] break-words">
                            {item.product?.name || 'Valor Avulso'}
                          </span>
                        </div>
                        <span className="text-[var(--teuco-green)] font-bold shrink-0 ml-2">
                          {formatCurrency(item.netItem)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[var(--teuco-text-muted)]">
            <p className="text-sm font-bold uppercase">Nenhuma venda encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}