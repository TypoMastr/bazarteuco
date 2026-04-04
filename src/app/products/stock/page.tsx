'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, AlertCircle, Package, Edit2, Check, FolderOpen, RefreshCw, Trash2, ArrowDownAZ, Hash, ChevronDown, ChevronRight, Minus, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { ExportModal } from '@/components/export-modal'
import { PageHeader } from '@/components/page-header'

type StockStatus = 'zerado' | 'baixo' | 'ok'
type SortOption = 'code' | 'name'

interface StockProduct {
  productId: number
  alphaCode: string
  name: string
  quantity: number
  minimumStock: number
  status: StockStatus
  sellValue: number
  categoryId: number | null
  categoryName: string | null
}

type StockExportData = {
  productId: number
  name: string
  alphaCode: string
  quantity: number
  status: 'zerado' | 'baixo' | 'ok'
  sellValue: number
  categoryName?: string
}[]

interface CategoryGroup {
  name: string
  products: StockProduct[]
}

export default function StockPage() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [products, setProducts] = useState<StockProduct[]>([])
  const [summary, setSummary] = useState({ zerado: 0, baixo: 0, ok: 0, total: 0 })
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<StockStatus | 'todos'>('todos')
  const [sortBy, setSortBy] = useState<SortOption>('code')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editQuantity, setEditQuantity] = useState<{ [key: number]: string }>({})
  const [updating, setUpdating] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null)
  const [modalQuantity, setModalQuantity] = useState('')
  const modalInputRef = useRef<HTMLInputElement>(null)
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const toast = useToast()

  async function fetchStock() {
    try {
      const res = await fetch('/api/stock')
      const data = await res.json()
      setProducts(data.products || [])
      setSummary(data.summary || { zerado: 0, baixo: 0, ok: 0, total: 0 })
    } catch (err) {
      console.error('Erro ao buscar estoque:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/stock/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.synced} produtos sincronizados`)
      } else {
        toast.error(data.error || 'Erro ao sincronizar')
      }
    } catch (err) {
      console.error('Sync error:', err)
      toast.error('Erro ao sincronizar')
    } finally {
      await fetchStock()
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortBy === 'code') {
        return (a.alphaCode || '').localeCompare(b.alphaCode || '')
      } else {
        return (a.name || '').localeCompare(b.name || '')
      }
    })
  }, [products, sortBy])

  const filteredProducts = useMemo(() => {
    let filtered = sortedProducts
    if (activeTab !== 'todos') {
      filtered = filtered.filter(p => p.status === activeTab)
    }
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.alphaCode?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [sortedProducts, activeTab, search])

  const productsByCategory = useMemo((): CategoryGroup[] => {
    const categoryMap = new Map<string, StockProduct[]>()
    const noCategory: StockProduct[] = []

    filteredProducts.forEach((product) => {
      const catName = product.categoryName || 'Sem Categoria'
      if (!product.categoryName) {
        noCategory.push(product)
      } else {
        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, [])
        }
        categoryMap.get(catName)!.push(product)
      }
    })

    const groups: CategoryGroup[] = []
    categoryMap.forEach((prods, name) => {
      groups.push({ name, products: prods })
    })
    if (noCategory.length > 0) {
      groups.push({ name: 'Sem Categoria', products: noCategory })
    }
    return groups.sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredProducts])

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  function toggleCategory(name: string) {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(name)) newSet.delete(name)
      else newSet.add(name)
      return newSet
    })
  }

  function openEditModal(product: StockProduct) {
    setEditingProduct(product)
    setModalQuantity(String(product.quantity))
    setTimeout(() => {
      modalInputRef.current?.focus()
      modalInputRef.current?.select()
    }, 100)
  }

  function closeEditModal() {
    setEditingProduct(null)
    setModalQuantity('')
  }

  function handleModalIncrement() {
    setModalQuantity(prev => String(Math.max(0, parseInt(prev || '0') + 1)))
  }

  function handleModalDecrement() {
    setModalQuantity(prev => String(Math.max(0, parseInt(prev || '0') - 1)))
  }

  async function handleModalSave() {
    if (!editingProduct) return
    const newQty = parseInt(modalQuantity)
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Quantidade inválida')
      return
    }
    setUpdating(true)
    try {
      // If multiple items selected, update all of them
      if (selectedIds.size > 0 && selectedIds.has(editingProduct.productId)) {
        const updates = Array.from(selectedIds).map(id => ({
          productId: id,
          quantity: newQty
        }))
        const res = await fetch('/api/stock', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        })
        if (res.ok) {
          toast.success(`${selectedIds.size} produto(s) atualizado(s)`)
          await fetchStock()
          setSelectedIds(new Set())
          closeEditModal()
        }
      } else {
        // Single item update
        const res = await fetch('/api/stock', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: editingProduct.productId, quantity: newQty })
        })
        if (res.ok) {
          toast.success('Estoque atualizado')
          await fetchStock()
          closeEditModal()
        }
      }
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setUpdating(false)
    }
  }

  function selectAllVisible() {
    const visibleIds = filteredProducts.map(p => p.productId)
    const allSelected = visibleIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleIds))
    }
  }

  async function handleUpdateQuantity(productId: number) {
    const newQty = parseInt(editQuantity[productId])
    if (isNaN(newQty) || newQty < 0) {
      toast.error('Quantidade inválida')
      return
    }
    setUpdating(true)
    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: newQty })
      })
      if (res.ok) {
        toast.success('Estoque atualizado')
        await fetchStock()
        const newEdit = { ...editQuantity }
        delete newEdit[productId]
        setEditQuantity(newEdit)
      }
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-12 bg-black/5 rounded-lg" />
        <div className="flex gap-4">
          <div className="h-20 flex-1 bg-black/5 rounded-lg" />
          <div className="h-20 flex-1 bg-black/5 rounded-lg" />
          <div className="h-20 flex-1 bg-black/5 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-black/5 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">

      <PageHeader
        title="Controle de Estoque"
        subtitle={`${summary.total} produtos`}
        backLink="/products"
        actions={
          <>
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="h-9">
              <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
              {syncing ? 'Sincronizando' : 'Sincronizar'}
            </Button>
            <ExportModal type="stock" data={products as StockExportData} />
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveTab(prev => prev === 'zerado' ? 'todos' : 'zerado')}
          className={cn(
            "p-4 rounded-xl text-center transition-all border-3 shadow-sm",
            activeTab === 'zerado' 
              ? "bg-red-600 text-white border-red-700 shadow-lg" 
              : "bg-white border-red-200 hover:border-red-400 hover:shadow-md"
          )}
        >
          <p className="text-2xl font-black">{summary.zerado}</p>
          <p className={cn("text-xs font-bold uppercase tracking-wider mt-1", activeTab !== 'zerado' ? "text-red-600" : "text-white")}>Zerados</p>
          {activeTab !== 'zerado' && <p className="text-[10px] text-red-400 mt-1 opacity-75">Filtrar</p>}
          {activeTab === 'zerado' && <p className="text-[10px] text-white/70 mt-1">Filtrando</p>}
        </button>
        <button
          onClick={() => setActiveTab(prev => prev === 'baixo' ? 'todos' : 'baixo')}
          className={cn(
            "p-4 rounded-xl text-center transition-all border-3 shadow-sm",
            activeTab === 'baixo' 
              ? "bg-orange-500 text-white border-orange-600 shadow-lg" 
              : "bg-white border-orange-200 hover:border-orange-400 hover:shadow-md"
          )}
        >
          <p className="text-2xl font-black">{summary.baixo}</p>
          <p className={cn("text-xs font-bold uppercase tracking-wider mt-1", activeTab !== 'baixo' ? "text-orange-600" : "text-white")}>Baixos</p>
          {activeTab !== 'baixo' && <p className="text-[10px] text-orange-400 mt-1 opacity-75">Filtrar</p>}
          {activeTab === 'baixo' && <p className="text-[10px] text-white/70 mt-1">Filtrando</p>}
        </button>
        <button
          onClick={() => setActiveTab(prev => prev === 'ok' ? 'todos' : 'ok')}
          className={cn(
            "p-4 rounded-xl text-center transition-all border-3 shadow-sm",
            activeTab === 'ok' 
              ? "bg-green-600 text-white border-green-700 shadow-lg" 
              : "bg-white border-green-200 hover:border-green-400 hover:shadow-md"
          )}
        >
          <p className="text-2xl font-black">{summary.ok}</p>
          <p className={cn("text-xs font-bold uppercase tracking-wider mt-1", activeTab !== 'ok' ? "text-green-600" : "text-white")}>OK</p>
          {activeTab !== 'ok' && <p className="text-[10px] text-green-400 mt-1 opacity-75">Filtrar</p>}
          {activeTab === 'ok' && <p className="text-[10px] text-white/70 mt-1">Filtrando</p>}
        </button>
      </div>

      {/* Clear filter indicator */}
      {activeTab !== 'todos' && (
        <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
          <span className="text-xs font-bold text-gray-600">
            Filtrando: <span className="uppercase">{activeTab}</span>
          </span>
          <button 
            onClick={() => setActiveTab('todos')}
            className="text-xs text-[var(--teuco-green)] font-bold hover:underline"
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--teuco-green)] opacity-50" />
          <Input
            placeholder="Buscar produto..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'code' ? 'filled' : 'outline'}
            size="sm"
            className="h-9 px-3 text-xs"
            onClick={() => setSortBy('code')}
          >
            <Hash className="h-4 w-4 mr-1" />
            Código
          </Button>
          <Button
            variant={sortBy === 'name' ? 'filled' : 'outline'}
            size="sm"
            className="h-9 px-3 text-xs"
            onClick={() => setSortBy('name')}
          >
            <ArrowDownAZ className="h-4 w-4 mr-1" />
            A-Z
          </Button>
          <Button variant="outline" size="sm" onClick={selectAllVisible} className="h-9">
            {filteredProducts.every(p => selectedIds.has(p.productId)) ? 'Desmarcar' : 'Selecionar'} Todos
          </Button>
        </div>
      </div>

      {/* Products grouped by Category */}
      <div className="space-y-6">
        {productsByCategory.map((group) => {
          const allSelected = group.products.length > 0 && group.products.every(p => selectedIds.has(p.productId))
          const someSelected = group.products.some(p => selectedIds.has(p.productId))
          const isCollapsed = collapsedCategories.has(group.name)

          return (
            <div key={group.name} className="space-y-2">
              {/* Category Header - clickable to collapse */}
              <div
                onClick={() => toggleCategory(group.name)}
                className="w-full flex items-center gap-2 bg-[var(--teuco-green-soft)] px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCategory(group.name) }}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-[var(--teuco-green)] shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--teuco-green)] shrink-0" />
                )}
                <FolderOpen className="h-4 w-4 text-[var(--teuco-green)] shrink-0" />
                <span className="text-sm font-bold text-[var(--teuco-green)] uppercase flex-1 text-left">
                  {group.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const allIds = group.products.map(p => p.productId)
                    const allSel = allIds.every(id => selectedIds.has(id))
                    setSelectedIds(prev => {
                      const newSet = new Set(prev)
                      if (allSel) allIds.forEach(id => newSet.delete(id))
                      else allIds.forEach(id => newSet.add(id))
                      return newSet
                    })
                  }}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    allSelected ? "bg-[var(--teuco-green)] border-[var(--teuco-green)]" :
                    someSelected ? "bg-[var(--teuco-green)]/50 border-[var(--teuco-green)]" :
                    "border-gray-300"
                  )}
                >
                  {(allSelected || someSelected) && <Check className="h-3 w-3 text-white" />}
                </button>
                <span className="text-xs text-[var(--teuco-text-muted)] shrink-0">
                  {group.products.length}
                </span>
              </div>

              {/* Products in this category */}
              {!isCollapsed && group.products.map((product) => {
                const statusColor = product.status === 'zerado' ? 'bg-red-500' : product.status === 'baixo' ? 'bg-amber-500' : 'bg-green-500'
                const isSelected = selectedIds.has(product.productId)
                
                return (
                  <div
                    key={product.productId}
                    className={cn(
                      "bg-white rounded-lg shadow-sm p-3 flex items-center gap-3 border-l-4",
                      isSelected ? "border-[var(--teuco-green)]" : "border-transparent"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(product.productId)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                        isSelected ? "bg-[var(--teuco-green)] border-[var(--teuco-green)]" : "border-gray-300"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </button>

                    {/* Code */}
                    {product.alphaCode && (
                      <div className="w-14 h-10 rounded-lg bg-[var(--teuco-green)] flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-white uppercase tracking-wide">
                          {product.alphaCode}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[var(--teuco-text)] uppercase break-words">
                        {product.name}
                      </p>
                    </div>

                    {/* Stock */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold", statusColor)}>
                        {product.quantity}
                      </div>
                      {/* Desktop: inline editing */}
                      <div className="hidden lg:flex items-center gap-1">
                        {editQuantity[product.productId] !== undefined ? (
                          <>
                            <Input
                              type="number"
                              inputMode="numeric"
                              onFocus={(e) => e.target.select()}
                              ref={(el) => { inputRefs.current[product.productId] = el }}
                              className="h-8 w-16 text-xs"
                              value={editQuantity[product.productId]}
                              onChange={(e) => setEditQuantity(prev => ({ ...prev, [product.productId]: e.target.value }))}
                              placeholder="Novo"
                            />
                            <Button size="sm" className="h-8" onClick={() => handleUpdateQuantity(product.productId)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setEditQuantity(prev => ({ ...prev, [product.productId]: String(product.quantity) }))
                              setTimeout(() => {
                                inputRefs.current[product.productId]?.focus()
                                inputRefs.current[product.productId]?.select()
                              }, 50)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {/* Mobile: open modal */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 lg:hidden"
                        onClick={() => openEditModal(product)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-[var(--teuco-text-muted)]">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Bulk edit floating button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 lg:left-72 lg:right-4 z-30">
          <div className="bg-[var(--teuco-green)] text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
            <span className="text-sm font-bold">{selectedIds.size} produto(s) selecionado(s)</span>
            <Button variant="ghost" size="sm" className="bg-white text-[var(--teuco-green)] hover:bg-white/90" onClick={() => {
              const firstSelected = products.find(p => selectedIds.has(p.productId))
              if (firstSelected) openEditModal(firstSelected)
            }} disabled={updating}>
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      )}

      {/* Edit Stock Modal - Mobile */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeEditModal} />
          <div className="relative bg-white rounded-t-2xl w-full p-6 pb-10 shadow-2xl">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="min-w-0 flex-1">
                {selectedIds.size > 1 ? (
                  <>
                    <p className="text-sm font-black text-[var(--teuco-text)] uppercase">
                      Editar {selectedIds.size} itens
                    </p>
                    <p className="text-xs text-[var(--teuco-text-muted)] font-bold">
                      {editingProduct.name} + {selectedIds.size - 1} outro(s)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-[var(--teuco-text)] uppercase truncate">
                      {editingProduct.name}
                    </p>
                    {editingProduct.alphaCode && (
                      <p className="text-xs text-[var(--teuco-text-muted)] font-bold">Código: {editingProduct.alphaCode}</p>
                    )}
                  </>
                )}
              </div>
              <button onClick={closeEditModal} className="p-2 ml-2 hover:bg-gray-100 rounded-full shrink-0">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Quantity display */}
            <div className="text-center mb-6">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quantidade Atual</p>
              <button
                onClick={() => {
                  modalInputRef.current?.focus()
                  modalInputRef.current?.select()
                }}
                className="text-6xl font-black text-[var(--teuco-green)] cursor-pointer hover:opacity-80 transition-opacity"
              >
                {modalQuantity}
              </button>
            </div>

            {/* Plus/Minus buttons */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={handleModalDecrement}
                className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition-all"
              >
                <Minus className="h-8 w-8 text-gray-700" />
              </button>
              
              <input
                ref={modalInputRef}
                type="number"
                inputMode="numeric"
                value={modalQuantity}
                onChange={(e) => setModalQuantity(e.target.value)}
                className="w-28 h-16 text-center text-3xl font-black border-2 border-[var(--teuco-green)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--teuco-green)]/30"
              />
              
              <button
                onClick={handleModalIncrement}
                className="w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </button>
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeEditModal}
                className="flex-1 h-14 text-sm font-black uppercase tracking-wider"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleModalSave}
                disabled={updating}
                className="flex-1 h-14 text-sm font-black uppercase tracking-wider shadow-lg shadow-[var(--teuco-green)]/30"
              >
                {updating ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}