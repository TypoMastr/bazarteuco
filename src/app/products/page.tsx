'use client'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, Plus, AlertCircle, Package, Edit2, X, Barcode, FolderOpen, ArrowDownAZ, Hash, RefreshCw, ChevronDown, ChevronRight, CloudUpload} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useToast } from '@/components/ui/toast'
import { ExportMenu } from '@/components/export-menu'
import { PageHeader } from '@/components/page-header'
import { ProgressModal } from '@/components/progress-modal'

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
  const [syncing, setSyncing] = useState(false)
  const [updatingSite, setUpdatingSite] = useState(false)
  const [updateSteps, setUpdateSteps] = useState<Array<{ id: string; label: string; icon: any; status: 'pending' | 'loading' | 'done' | 'error' }>>([])
  const [updateCurrentStep, setUpdateCurrentStep] = useState('')
  const [updateError, setUpdateError] = useState<string | null>(null)
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
    const steps = [
      { id: 'syncCategories', label: 'Buscando categorias do sistema', icon: CloudUpload, status: 'pending' as const },
      { id: 'syncProducts', label: 'Buscando lista de produtos', icon: CloudUpload, status: 'pending' as const },
      { id: 'generateHTML', label: 'Montando página do site', icon: CloudUpload, status: 'pending' as const },
      { id: 'uploadFTP', label: 'Enviando para o servidor', icon: CloudUpload, status: 'pending' as const },
    ]

    setUpdateSteps(steps)
    setUpdateCurrentStep('syncCategories')
    setUpdateError(null)
    setUpdatingSite(true)

    async function setStep(id: string, status: 'loading' | 'done' | 'error') {
      setUpdateSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
      if (status === 'loading') setUpdateCurrentStep(id)
    }

    try {
      setStep('syncCategories', 'loading')
      await new Promise(r => setTimeout(r, 800))
      setStep('syncCategories', 'done')

      setStep('syncProducts', 'loading')
      await new Promise(r => setTimeout(r, 1500))
      setStep('syncProducts', 'done')

      setStep('generateHTML', 'loading')
      await new Promise(r => setTimeout(r, 500))

      const res = await fetch('/api/site/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')

      setStep('generateHTML', 'done')
      setStep('uploadFTP', 'loading')
      await new Promise(r => setTimeout(r, 800))
      setStep('uploadFTP', 'done')

      await refetch()
    } catch (err: any) {
      setStep(updateCurrentStep, 'error')
      setUpdateError(err.message || 'Erro ao atualizar site')
    }
  }

  function handleUpdateSiteComplete() {
    setUpdatingSite(false)
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
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-full max-w-lg">
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
                <span className="text-xs text-[var(--teuco-text-muted)] shrink-0">
                  {group.products.length}
                </span>
              </div>

              {/* Products in this category */}
              {!isCollapsed && group.products.map((product: any) => {
                return (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.id}/edit`}
                    className="block bg-white rounded-lg shadow-sm p-3 border-l-4 border-transparent cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      
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

      <ProgressModal
        open={updatingSite}
        steps={updateSteps}
        currentStep={updateCurrentStep}
        error={updateError}
        onComplete={handleUpdateSiteComplete}
      />
    </div>
  )
}