'use client'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, AlertCircle, Package, Edit2, Archive, Trash2, X, Barcode, Check, FolderOpen, ArrowDownAZ, Hash, PackageCheck, RefreshCw, ChevronDown, ChevronRight, CloudUpload} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useToast } from '@/components/ui/toast'
import { ExportMenu } from '@/components/export-menu'
import { PageHeader } from '@/components/page-header'

type SortOption = 'name' | 'code'

interface CategoryGroup {
  name: string
  products: any[]
}

export default function ProductsPage() {
  const { data: products, loading, error, totalRecords, refetch } = useProducts()
  const { data: categories } = useCategories()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('code')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [mutating, setMutating] = useState<number | null>(null)
  const [deletingMultiple, setDeletingMultiple] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [updatingSite, setUpdatingSite] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const toast = useToast()

  async function handleSync() {
    setSyncing(true)
    try {
      await refetch()
      toast.success('Produtos sincronizados')
    } catch {
      toast.error('Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function handleUpdateSite() {
    setUpdatingSite(true)
    try {
      const res = await fetch('/api/site/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      toast.success('Site atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar site')
    } finally {
      setUpdatingSite(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return products
    return products.filter((p: any) =>
      (p.name || '').toLowerCase().includes(q)
      || (p.alphaCode || '').toLowerCase().includes(q)
      || (p.eanCode || '').toLowerCase().includes(q)
    )
  }, [products, search])

  const sortedProducts = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      if (sortBy === 'code') {
        const codeA = a.alphaCode || ''
        const codeB = b.alphaCode || ''
        return codeA.localeCompare(codeB)
      } else {
        const nameA = a.name || ''
        const nameB = b.name || ''
        return nameA.localeCompare(nameB)
      }
    })
  }, [filtered, sortBy])

  const productsByCategory = useMemo((): CategoryGroup[] => {
    const categoryMap = new Map<string, any[]>()
    const noCategory: any[] = []

    sortedProducts.forEach((product: any) => {
      const catName = product.category?.description || product.category?.name
      if (!catName) {
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
  }, [sortedProducts])

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  function selectAll(categoryProducts: any[]) {
    const allIds = categoryProducts.map((p: any) => p.id)
    const allSelected = allIds.every((id: number) => selectedIds.has(id))
    
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (allSelected) {
        allIds.forEach((id: number) => newSet.delete(id))
      } else {
        allIds.forEach((id: number) => newSet.add(id))
      }
      return newSet
    })
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm('Tem certeza que deseja EXCLUIR este produto? Esta ação não pode ser desfeita.')
    if (!confirmed) return
    setMutating(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro')
      toast.success('Produto excluído')
      refetch()
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setMutating(null)
    }
  }

  async function handleDeleteMultiple() {
    const count = selectedIds.size
    const confirmed = window.confirm(`Tem certeza que deseja EXCLUIR ${count} produto(s)? Esta ação não pode ser desfeita.`)
    if (!confirmed) return

    setDeletingMultiple(true)
    let successCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setSelectedIds(new Set())
    refetch()
    setDeletingMultiple(false)

    if (failCount === 0) {
      toast.success(`${successCount} produto(s) excluído(s)`)
    } else {
      toast.error(`${successCount} excluído(s), ${failCount} erro(s)`)
    }
  }

  async function handleArchive(id: number, archived: boolean) {
    setMutating(id)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archived }),
      })
      if (!res.ok) throw new Error('Erro')
      toast.success(archived ? 'Arquivado' : 'Reativado')
      refetch()
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setMutating(null)
    }
  }

  function toggleCategory(name: string) {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(name)) newSet.delete(name)
      else newSet.add(name)
      return newSet
    })
  }

  if (loading) return (
    <div className="p-4 space-y-3 animate-pulse max-w-5xl mx-auto">
      <div className="h-10 bg-black/5 rounded-lg" />
      <div className="h-8 bg-black/5 rounded-lg" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-black/5 rounded-lg" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="p-4 max-w-5xl mx-auto">
      <Card className="p-6 text-center bg-red-50">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-red-600 uppercase">Erro ao carregar</p>
      </Card>
    </div>
  )

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">

      <PageHeader
        title="Produtos"
        subtitle={`${totalRecords} itens`}
        backLink="/sales"
        actions={
          <>
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="h-9 px-4 text-xs">
              <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
              {syncing ? 'Sincronizando' : 'Sincronizar'}
            </Button>
            <Button variant="outline" onClick={handleUpdateSite} disabled={updatingSite} className="h-9 px-4 text-xs">
              <CloudUpload className={cn("h-4 w-4 mr-1", updatingSite && "animate-spin")} />
              {updatingSite ? 'Atualizando...' : 'Atualizar Site'}
            </Button>
            <Link href="/products/new">
              <Button className="h-9 px-4 text-xs">
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </Link>
            <ExportMenu products={products} />
          </>
        }
      />

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--teuco-green)] opacity-50" />
          <Input
            placeholder="Buscar por nome, código..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'name' ? 'filled' : 'outline'}
            size="sm"
            className="h-9 px-3 text-xs"
            onClick={() => setSortBy('name')}
          >
            <ArrowDownAZ className="h-4 w-4 mr-1" />
            A-Z
          </Button>
          <Button
            variant={sortBy === 'code' ? 'filled' : 'outline'}
            size="sm"
            className="h-9 px-3 text-xs"
            onClick={() => setSortBy('code')}
          >
            <Hash className="h-4 w-4 mr-1" />
            Código
          </Button>
        </div>
      </div>

      {/* Products grouped by Category */}
      <div className="space-y-6">
        {productsByCategory.map((group) => {
          const allSelected = group.products.length > 0 && group.products.every((p: any) => selectedIds.has(p.id))
          const someSelected = group.products.some((p: any) => selectedIds.has(p.id))
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
                    selectAll(group.products)
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
              {!isCollapsed && group.products.map((product: any) => {
                const isSelected = selectedIds.has(product.id)

                return (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.id}/edit`}
                    className={cn(
                      "block bg-white rounded-lg shadow-sm p-3 border-l-4 cursor-pointer",
                      isSelected ? "border-[var(--teuco-green)]" : "border-transparent",
                      "hover:shadow-md transition-shadow"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox - prevent click from triggering link */}
                      <div 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleSelect(product.id)
                        }}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-[var(--teuco-green)] border-[var(--teuco-green)]" : "border-gray-300"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      
                      {/* Big Code Display - instead of icon */}
                      {product.alphaCode && (
                        <div className="w-14 h-10 rounded-lg bg-[var(--teuco-green)] flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-white uppercase tracking-wide">
                            {product.alphaCode}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap break-words">
                          <span className="text-sm font-black text-[var(--teuco-text)] uppercase">
                            {product.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {product.eanCode && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--teuco-text-muted)]">
                              <Barcode className="h-3 w-3" />
                              {product.eanCode}
                            </span>
                          )}
                          {(product.category?.description || product.category?.name) && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-5">
                              {product.category.description || product.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-[var(--teuco-green)]">
                          {formatCurrency(product.sellValue)}
                        </p>
                        {product.promotionalValue > 0 && (
                          <p className="text-[10px] text-red-500 line-through">
                            {formatCurrency(product.promotionalValue)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Desktop buttons - hidden on mobile */}
                      <div className="hidden lg:flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault()
                          handleArchive(product.id, !product.archived)
                        }}
                        disabled={mutating === product.id}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(product.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-[var(--teuco-text-muted)]">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold uppercase">Nenhum produto</p>
        </div>
      )}

      {/* Floating delete button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 lg:left-72 lg:right-4 z-30">
          <div className="bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
            <span className="text-sm font-bold">
              {selectedIds.size} produto(s) selecionado(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white text-red-500 hover:bg-red-50 h-8"
              onClick={handleDeleteMultiple}
              disabled={deletingMultiple}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {deletingMultiple ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}