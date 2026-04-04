'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getCategoryPrefix, findNextCode, validateCode } from '@/lib/code-suggestion'
import { PageHeader } from '@/components/page-header'

interface Category {
  id: number
  name?: string
  description?: string
}

export default function NewProductPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [codesByCategory, setCodesByCategory] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAutoCode, setIsAutoCode] = useState(false)
  const [form, setForm] = useState({
    alphaCode: '', name: '', sellValue: '', costValue: '',
    minimumStock: '1', observation: '',
    category: '',
    detail: { text: '', viewMode: 'TEXT', color: '#ffffff' },
  })
  const [initialStock, setInitialStock] = useState('1')

  useEffect(() => {
    async function loadData() {
      try {
        const [catsRes, codesRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products/codes-by-category?all=true'),
        ])
        
        const catsData = await catsRes.json()
        const codesData = await codesRes.json()
        
        const cats = catsData.items || catsData.data || []
        const sorted = [...cats].sort((a: Category, b: Category) => {
          const nameA = (a.name || a.description || '').toLowerCase()
          const nameB = (b.name || b.description || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
        
        setCategories(sorted)
        setCodesByCategory(codesData)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }
    loadData()
  }, [])

  function generateNextCode(categoryId: string) {
    if (!categoryId) return
    
    const category = categories.find(c => String(c.id) === categoryId)
    const categoryName = category?.name || category?.description || ''
    const prefix = getCategoryPrefix(categoryId, categoryName)
    const existingCodes = codesByCategory[categoryId] || []
    
    const nextCode = findNextCode(prefix, existingCodes)
    setForm(prev => ({ ...prev, alphaCode: nextCode }))
    setIsAutoCode(true)
  }

  function handleCategoryChange(categoryId: string) {
    setForm(prev => ({ ...prev, category: categoryId }))
    setErrors(prev => ({ ...prev, alphaCode: '' }))
    
    if (categoryId) {
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
    
    const validation = validateCode(value, prefix, existingCodes)
    
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
    if (!form.category) errs.category = 'Selecione uma categoria'
    if (!form.sellValue || parseFloat(form.sellValue) <= 0) errs.sellValue = 'Preço de venda deve ser maior que zero'
    if (form.costValue && parseFloat(form.costValue) < 0) errs.costValue = 'Preço de custo não pode ser negativo'
    
    if (!form.alphaCode.trim()) {
      errs.alphaCode = 'Código é obrigatório'
    } else if (!form.category) {
      errs.alphaCode = 'Selecione uma categoria primeiro'
    } else {
      const category = categories.find(c => String(c.id) === form.category)
      const categoryName = category?.name || category?.description || ''
      const prefix = getCategoryPrefix(form.category, categoryName)
      const existingCodes = codesByCategory[form.category] || []
      
      const validation = validateCode(form.alphaCode, prefix, existingCodes)
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
        description: form.name,
        sellValue: parseFloat(form.sellValue) || 0,
        costValue: parseFloat(form.costValue) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
        category: parseInt(form.category) || undefined,
        initialStock: parseInt(initialStock) || 1,
      }
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Produto criado com sucesso')
        router.push('/products')
      } else {
        const err = await res.json().catch(() => null)
        toast.error('Erro ao criar produto', err?.error || 'Verifique os dados e tente novamente.')
      }
    } catch {
      toast.error('Erro ao criar produto', 'Não foi possível conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto pb-32">
      <PageHeader
        title="Novo Produto"
        subtitle="Cadastro de item no catálogo"
        backLink="/products"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-8">
          <div className="rounded-[12px] text-[var(--teuco-text)] border border-[var(--teuco-border)] bg-white p-10 md:p-12">
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
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Categoria *</Label>
                  <Select 
                    value={form.category} 
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    options={[{ value: '', label: 'Selecione uma categoria' }, ...categories.map((c) => ({ value: c.id, label: (c.name || c.description || '').toUpperCase() }))]} 
                    className="h-16 text-sm font-bold uppercase tracking-wider"
                  />
                  {errors.category && <p className="text-[10px] font-bold text-red-600 mt-1 uppercase tracking-wider ml-2">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn(
                      "text-[10px] font-black uppercase tracking-[2px] ml-2",
                      form.category ? "text-[var(--teuco-green)]" : "text-gray-400"
                    )}>Código *</Label>
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
                      placeholder="0000"
                      disabled={!form.category}
                      className={cn(
                        "h-16 text-sm font-bold uppercase tracking-wider pr-20",
                        !form.category && "bg-gray-50 cursor-not-allowed opacity-60",
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
                  {!form.category && <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider ml-2">Selecione uma categoria para gerar o código</p>}
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
                  <Label className="text-[10px] font-black uppercase tracking-[2px] text-[var(--teuco-green)] ml-2">Estoque Inicial *</Label>
                  <Input 
                    type="number"
                    min="0"
                    inputMode="numeric"
                    onFocus={(e) => e.target.select()}
                    value={initialStock} 
                    onChange={(e) => setInitialStock(e.target.value)} 
                    className="h-16 text-xl font-black text-[var(--teuco-green)]"
                  />
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
                  {loading ? 'PROCESSANDO...' : 'CADASTRAR PRODUTO'}
                </Button>
                <Link href="/products">
                  <Button variant="ghost" className="h-18 w-full text-[xs] font-black uppercase tracking-[2px] text-red-500 hover:bg-red-50">
                    CANCELAR
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="md:col-span-4 space-y-8">
           <div className="rounded-[12px] text-[var(--teuco-text)] border border-[var(--teuco-border)] bg-white p-8">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-full bg-[var(--teuco-green)] text-white flex items-center justify-center">
                    <span className="text-lg font-black">i</span>
                 </div>
                 <h2 className="text-xl font-black uppercase tracking-tighter font-montserrat text-[var(--teuco-green)]">Guia de Cadastro</h2>
              </div>
              <ul className="space-y-6">
                 {[
                   "O código Alfa é gerado automaticamente ao selecionar a categoria.",
                   "Use nomes claros e em letras maiúsculas para melhor legibilidade.",
                   "Preço de venda é o único campo financeiro obrigatório.",
                   "O estoque inicial padrão é 1 unidade."
                 ].map((tip, i) => (
                   <li key={i} className="flex gap-4 items-start">
                      <span className="text-[var(--teuco-green)] text-lg font-black shrink-0">•</span>
                      <p className="text-[11px] font-bold uppercase tracking-wider leading-relaxed">{tip}</p>
                   </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  )
}