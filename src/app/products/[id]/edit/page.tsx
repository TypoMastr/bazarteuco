'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Edit3, Info, CheckCircle2, Loader2, AlertCircle, Sparkles, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getCategoryPrefix, findNextCode, validateCodeWithException } from '@/lib/code-suggestion'
import { PageHeader } from '@/components/page-header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Category {
  id: number
  name?: string
  description?: string
}

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [codesByCategory, setCodesByCategory] = useState<Record<string, string[]>>({})
  const [initialCategory, setInitialCategory] = useState<string>('')
  const [isAutoCode, setIsAutoCode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    alphaCode: '', name: '', sellValue: '', costValue: '', eanCode: '',
    netWeight: '', grossWeight: '', minimumStock: '', observation: '',
    exTipi: '', cest: '', isFractional: false, noStock: false,
    isOpenValue: false, showCatalog: true, promotionalValue: '',
    promotionalExpirationDate: '', promotionalDisplayTimer: false,
    category: '', unit: '', ncm: '', productOrigin: 'NACIONAL',
    taxesRuleId: '', favorite: 0, googleProductCategoryId: '', supplierId: '',
    detail: { text: '', viewMode: 'TEXT', color: '#ffffff' },
  })
  const [currentStock, setCurrentStock] = useState<number>(0)
  const [productData, setProductData] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [codesRes] = await Promise.all([
          fetch('/api/products/codes-by-category?all=true'),
        ])
        
        const codesData = await codesRes.json()
        setCodesByCategory(codesData)
        
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch('/api/categories'),
        ])
        
        if (!productRes.ok) {
          if (productRes.status === 404) { setError('Produto não encontrado') } 
          else { setError('Erro ao carregar produto') }
          setFetching(false)
          return
        }
        
        const [data, categoriesData] = await Promise.all([productRes.json(), categoriesRes.json()])
        
        setProductData(data)
        
        const categoryId = String(data.category?.id || data.category || '')
        
        // Fetch current stock from MySQL
        try {
          const stockRes = await fetch(`/api/stock`)
          const stockData = await stockRes.json()
          const stockItem = stockData.products?.find((s: any) => s.productId === data.id)
          if (stockItem) {
            setCurrentStock(stockItem.quantity)
          }
        } catch {
          // ignore
        }
        
        setForm({
          alphaCode: data.alphaCode || '', name: data.name || '',
          sellValue: String(data.sellValue || ''), costValue: String(data.costValue || ''),
          eanCode: data.eanCode || '', netWeight: String(data.netWeight || ''),
          grossWeight: String(data.grossWeight || ''), minimumStock: String(data.minimumStock || ''),
          observation: data.observation || '', exTipi: data.exTipi || '', cest: data.cest || '',
          isFractional: data.isFractional || false, noStock: data.noStock || false,
          isOpenValue: data.isOpenValue || false, showCatalog: data.showCatalog ?? true,
          promotionalValue: String(data.promotionalValue || ''),
          promotionalExpirationDate: data.promotionalExpirationDate ? data.promotionalExpirationDate.split('T')[0] : '',
          promotionalDisplayTimer: data.promotionalDisplayTimer || false,
          category: categoryId,
          unit: String(data.unit?.id || data.unit || ''),
          ncm: String(data.ncm?.code || data.ncm || ''),
          productOrigin: data.productOrigin || 'NACIONAL',
          taxesRuleId: data.taxesRule?.id || data.taxesRuleId || '',
          favorite: data.favorite || 0,
          googleProductCategoryId: String(data.googleProductCategory?.id || ''),
          supplierId: String(data.supplier?.id || data.supplierId || ''),
          detail: data.detail || { text: '', viewMode: 'TEXT', color: '#ffffff' },
        })
        
        setInitialCategory(categoryId)
        const cats = categoriesData.items || categoriesData.data || categoriesData || []
        const sorted = [...cats].sort((a: Category, b: Category) => {
          const nameA = (a.name || a.description || '').toLowerCase()
          const nameB = (b.name || b.description || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
        setCategories(sorted)
        
        const existingCodes = codesData[categoryId] || []
        if (existingCodes.includes(data.alphaCode)) {
          setIsAutoCode(true)
        }
        
        setFetching(false)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados')
        setFetching(false)
      }
    }
    
    if (id) {
      loadData()
    }
  }, [id])

  function generateNextCode(categoryId: string) {
    if (!categoryId) return
    
    const category = categories.find(c => String(c.id) === categoryId)
    const categoryName = category?.name || category?.description || ''
    const prefix = getCategoryPrefix(categoryId, categoryName)
    const existingCodes = codesByCategory[categoryId] || []
    
    const nextCode = findNextCode(prefix, existingCodes)
    setForm(prev => ({ ...prev, alphaCode: nextCode, category: categoryId }))
    setIsAutoCode(true)
  }

  function handleCategoryChange(categoryId: string) {
    const oldCategory = form.category
    
    setForm(prev => ({ ...prev, category: categoryId }))
    setErrors(prev => ({ ...prev, alphaCode: '' }))
    
    if (categoryId !== oldCategory && categoryId) {
      generateNextCode(categoryId)
    }
  }

  function handleAlphaCodeChange(value: string) {
    setForm(prev => ({ ...prev, alphaCode: value }))
    setIsAutoCode(false)
    
    const category = categories.find(c => String(c.id) === form.category)
    const categoryName = category?.name || category?.description || ''
    const prefix = getCategoryPrefix(form.category, categoryName)
    const existingCodes = codesByCategory[form.category] || []
    
    const validation = validateCodeWithException(value, prefix, existingCodes, form.alphaCode)
    
    if (!validation.valid && value.trim() !== '') {
      setErrors(prev => ({ ...prev, alphaCode: validation.error || '' }))
    } else {
      setErrors(prev => ({ ...prev, alphaCode: '' }))
    }
  }

  function handleRegenerateCode() {
    if (form.category) {
      generateNextCode(form.category)
    }
  }

  function validate() {
    const errs: Record<string, string> = {}
    
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    if (!form.sellValue || parseFloat(form.sellValue) <= 0) errs.sellValue = 'Preço de venda deve ser maior que zero'
    if (form.costValue && parseFloat(form.costValue) < 0) errs.costValue = 'Preço de custo não pode ser negativo'
    
    if (!form.alphaCode.trim()) {
      errs.alphaCode = 'Código é obrigatório'
    } else {
      const category = categories.find(c => String(c.id) === form.category)
      const categoryName = category?.name || category?.description || ''
      const prefix = getCategoryPrefix(form.category, categoryName)
      const existingCodes = codesByCategory[form.category] || []
      
      const validation = validateCodeWithException(form.alphaCode, prefix, existingCodes, form.alphaCode)
      if (!validation.valid) {
        errs.alphaCode = validation.error || ''
      }
    }
    
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const body = {
        ...form,
        sellValue: parseFloat(form.sellValue) || 0,
        costValue: parseFloat(form.costValue) || 0,
        netWeight: parseFloat(form.netWeight) || 0,
        grossWeight: parseFloat(form.grossWeight) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
        promotionalValue: parseFloat(form.promotionalValue) || 0,
        category: parseInt(form.category) || undefined,
        unit: parseInt(form.unit) || undefined,
        ncm: parseInt(form.ncm) || undefined,
        supplierId: parseInt(form.supplierId) || undefined,
      }
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Produto atualizado com sucesso')
        router.push('/products')
      } else {
        const err = await res.json().catch(() => null)
        toast.error('Erro ao atualizar produto', err?.error || 'Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Erro ao atualizar produto', 'Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleDelete() {
    setShowDeleteConfirm(false)
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        toast.error(data.error || 'Erro ao excluir produto')
      } else {
        toast.success('Produto excluído')
        router.push('/products')
      }
    } catch {
      toast.error('Erro ao excluir produto')
    } finally {
      setDeleting(false)
    }
  }

  if (fetching) return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto pb-32">
      <PageHeader
        title="Editar Item"
        subtitle={`ID: ${id} · Atualização de cadastro`}
        backLink="/products"
      />
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-20 h-20 mb-6">
          <svg className="animate-spin w-20 h-20" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-[var(--teuco-green)]/20"
            />
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4 94.2"
              strokeLinecap="round"
              className="text-[var(--teuco-green)]"
            />
          </svg>
        </div>
        <p className="text-sm font-black text-[var(--teuco-green)] uppercase tracking-wider mb-2">
          Buscando dados da SmartPOS
        </p>
        <p className="text-xs text-[var(--teuco-text-muted)] uppercase tracking-wide">
          Sincronizando informações do produto...
        </p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6 max-w-5xl mx-auto">
      <Card variant="teuco" className="p-12 text-center bg-red-50 border-red-200">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-red-900 uppercase font-montserrat">Erro no Carregamento</h3>
        <p className="text-red-700/80 mt-2 font-bold uppercase tracking-widest text-xs">{error}</p>
        <Link href="/products" className="inline-block mt-8">
           <Button variant="tonal" className="px-8 h-12">VOLTAR AO ESTOQUE</Button>
        </Link>
      </Card>
    </div>
  )

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto pb-32">
      <PageHeader
        title="Editar Item"
        subtitle={`ID: ${id} · Atualização de cadastro`}
        backLink="/products"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-8">
          <Card variant="teuco" className="p-10 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Nome Completo do Produto *</Label>
                  <Textarea
                    value={form.name} 
                    onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors((p) => ({ ...p, name: '' })) }} 
                    placeholder="EX: CAMISETA LOGO TEUCO G"
                    required 
                    className="text-sm font-bold uppercase tracking-wider p-4 resize-none overflow-hidden"
                    style={{ minHeight: '3.5rem' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.max(target.scrollHeight, 56) + 'px'
                    }}
                  />
                  {errors.name && <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider ml-2">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Código *</Label>
                    {isAutoCode && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--teuco-green)] uppercase tracking-wider bg-[var(--teuco-green)]/10 px-2 py-1 rounded-full">
                        <Sparkles className="h-3 w-3" />
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input 
                      value={form.alphaCode} 
                      onChange={(e) => handleAlphaCodeChange(e.target.value)} 
                      placeholder="Código do produto"
                      className={cn(
                        "h-16 text-sm font-bold uppercase tracking-wider pr-20",
                        errors.alphaCode && "border-red-500 focus:border-red-500"
                      )}
                    />
                    {form.category && (
                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--teuco-green)] hover:bg-[var(--teuco-green)]/10 rounded-full transition-colors"
                        title="Gerar novo código"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {errors.alphaCode && <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider ml-2">{errors.alphaCode}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Categoria *</Label>
                  <Select 
                    value={form.category} 
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    options={categories.map((c) => ({ value: c.id, label: (c.name || c.description || '').toUpperCase() }))} 
                    className="h-16 text-sm font-bold uppercase tracking-wider"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Preço de Venda *</Label>
                  <div className="relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--teuco-green)] font-black text-sm">R$</span>
                     <Input 
                        type="number" 
                        step="0.01" 
                        inputMode="decimal"
                        onFocus={(e) => e.target.select()}
                        value={form.sellValue} 
                        onChange={(e) => { setForm({ ...form, sellValue: e.target.value }); setErrors((p) => ({ ...p, sellValue: '' })) }} 
                        placeholder="0,00"
                        required 
                        className="h-16 pl-14 text-xl font-black text-[var(--teuco-green)] tracking-tighter"
                     />
                  </div>
                  {errors.sellValue && <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider ml-2">{errors.sellValue}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Preço de Custo</Label>
                  <div className="relative">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-black/30 font-black text-sm">R$</span>
                     <Input 
                        type="number" 
                        step="0.01" 
                        inputMode="decimal"
                        onFocus={(e) => e.target.select()}
                        value={form.costValue} 
                        onChange={(e) => { setForm({ ...form, costValue: e.target.value }); setErrors((p) => ({ ...p, costValue: '' })) }} 
                        placeholder="0,00"
                        className="h-16 pl-14 text-xl font-bold text-black/40 tracking-tighter"
                     />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Estoque Mínimo</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    inputMode="numeric"
                    onFocus={(e) => e.target.select()}
                    value={form.minimumStock} 
                    onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} 
                    className="h-16 text-sm font-bold uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Estoque Atual</Label>
                  <div className="h-16 flex items-center px-4 bg-[var(--teuco-green-soft)] rounded-lg border border-[var(--teuco-green)]/20">
                    <span className="text-xl font-black text-[var(--teuco-green)]">{currentStock}</span>
                    <span className="text-xs font-bold text-[var(--teuco-text-muted)] ml-2 uppercase">unidades</span>
                  </div>
                  <p className="text-[9px] text-[var(--teuco-text-muted)] uppercase tracking-wider ml-2">Edite na página de controle de estoque</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Observações Detalhadas</Label>
                <Textarea 
                  value={form.observation} 
                  onChange={(e) => setForm({ ...form, observation: e.target.value })} 
                  placeholder="DIGITE INFORMAÇÕES ADICIONAIS SOBRE O PRODUTO..."
                  className="min-h-[140px] text-sm font-bold uppercase tracking-wider p-6 leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-4 pt-4 max-w-sm mx-auto">
                <Button type="submit" disabled={loading} className="h-18 text-sm tracking-[3px] shadow-2xl shadow-[var(--teuco-green)]/30">
                  {loading ? 'SINCRONIZANDO...' : 'SALVAR ALTERAÇÕES'}
                </Button>
                <Link href="/products">
                  <Button variant="ghost" className="h-18 w-full text-[xs] font-black uppercase tracking-[2px] text-red-500 hover:bg-red-50">
                    CANCELAR
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 h-12 w-full rounded-lg border-2 border-red-200 bg-red-50 text-red-600 font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'EXCLUINDO...' : 'EXCLUIR PRODUTO'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          title="Excluir Produto"
          message={`Tem certeza que deseja EXCLUIR "${productData?.name || id}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        <div className="md:col-span-4 space-y-8">
           <Card variant="teuco" className="p-8 bg-white border border-black/[0.05] shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-full bg-[var(--teuco-green)] text-white flex items-center justify-center shadow-lg">
                    <Edit3 className="h-6 w-6" />
                 </div>
                 <h2 className="text-xl font-black uppercase tracking-tighter font-montserrat text-[var(--teuco-green)]">Dashboard</h2>
              </div>
              <div className="space-y-6">
                 <div className="p-6 bg-[var(--teuco-green-soft)] rounded-2xl">
                    <p className="text-[10px] font-black text-[var(--teuco-green)] uppercase tracking-widest mb-1">Status de Rede</p>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                       <span className="text-xs font-bold uppercase tracking-wider text-[var(--teuco-green)]">Conectado / Pronto</span>
                    </div>
                 </div>
                 <p className="text-[11px] font-bold uppercase tracking-wider leading-relaxed text-[var(--teuco-text-muted)] opacity-60">
                    Todas as alterações salvas aqui serão propagadas em tempo real para os terminais de venda.
                 </p>
              </div>
           </Card>

           <Card variant="outlined" className="p-8 bg-white/50 border-dashed text-center">
              <Info className="h-12 w-12 text-[var(--teuco-green)] mx-auto mb-4 opacity-20" />
              <p className="text-[9px] font-black text-[var(--teuco-text-muted)] uppercase tracking-[3px] leading-loose">
                 VERIFIQUE SEMPRE O PREÇO DE <br/> VENDA ANTES DE CONFIRMAR <br/> AS ALTERAÇÕES.
              </p>
           </Card>
        </div>
      </div>
    </div>
  )
}