import React, { useState, useEffect } from 'react';
import { Api } from '../services/api';
import { Product, Category, Variant } from '../types';
import { PageHeader, Button, Input, Card } from '../components/UI';
import { Plus, X, Save, AlertCircle } from 'lucide-react';

interface Props {
  productId?: number;
  onBack: () => void;
  onSave: () => void;
}

export const ProductForm: React.FC<Props> = ({ productId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Product>({
    name: '',
    sellValue: 0,
    minimumStock: 0,
    hasVariant: false,
    variants: []
  });

  useEffect(() => {
    const init = async () => {
      try {
        const cats = await Api.Categories.list();
        setCategories(cats);
        
        if (productId) {
          const prod = await Api.Products.get(productId);
          setForm(prod);
        }
      } catch (e) {
        alert('Erro ao carregar dados');
      }
    };
    init();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      
      if (productId) {
        await Api.Products.update(productId, payload);
      } else {
        await Api.Products.create(payload);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    setForm(prev => ({
      ...prev,
      hasVariant: true,
      variants: [...(prev.variants || []), { name: '', sku: '', sellValue: 0 }]
    }));
  };

  const removeVariant = (idx: number) => {
    const newVariants = [...(form.variants || [])];
    newVariants.splice(idx, 1);
    setForm(prev => ({ ...prev, variants: newVariants, hasVariant: newVariants.length > 0 }));
  };

  const updateVariant = (idx: number, field: keyof Variant, value: any) => {
    const newVariants = [...(form.variants || [])];
    newVariants[idx] = { ...newVariants[idx], [field]: value };
    setForm(prev => ({ ...prev, variants: newVariants }));
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col animate-in slide-in-from-right-4 duration-300">
      <PageHeader 
        title={productId ? "Editar Produto" : "Novo Produto"} 
        onBack={onBack}
      />
      
      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-8 pb-32 flex-1 overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info Column */}
          <div className="space-y-4">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 md:space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                    <div className="w-1 h-4 md:h-5 bg-emerald-500 rounded-full"></div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base">Informações Básicas</h3>
                </div>
                
                <Input 
                label="Nome do Produto" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                required
                placeholder="Ex: Camiseta Azul"
                />
                
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Input 
                    label="Preço (R$)" 
                    type="number" 
                    step="0.01"
                    value={form.sellValue} 
                    onChange={e => setForm({...form, sellValue: parseFloat(e.target.value)})}
                    required
                />
                <Input 
                    label="Estoque" 
                    type="number" 
                    value={form.minimumStock} 
                    onChange={e => setForm({...form, minimumStock: parseFloat(e.target.value)})}
                />
                </div>
                <div className="w-full group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 group-focus-within:text-emerald-600 transition-colors duration-300">Categoria</label>
                <div className="relative">
                    <select 
                        className="w-full px-4 py-3 md:px-5 md:py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 appearance-none transition-all duration-300 text-sm md:text-base"
                        value={form.categoryId || form.category?.id || ''}
                        onChange={e => {
                            const catId = parseInt(e.target.value);
                            const selectedCat = categories.find(c => c.id === catId);
                            setForm({
                                ...form, 
                                categoryId: catId, 
                                category: selectedCat ? { id: selectedCat.id, description: selectedCat.name } : undefined
                            });
                        }}
                    >
                        <option value="">Selecione uma Categoria</option>
                        {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </div>
                </div>
            </div>
          </div>

          {/* Variants Column */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <div className="w-1 h-4 md:h-5 bg-purple-500 rounded-full"></div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base">Variações</h3>
                 </div>
              <button type="button" onClick={addVariant} className="text-xs md:text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3 md:w-4 md:h-4" /> Adicionar
              </button>
            </div>
            
            <div className="space-y-3">
                {form.variants?.map((variant, idx) => (
                <Card key={idx} className="p-3 md:p-4 relative animate-in fade-in slide-in-from-bottom-2 border-l-4 border-l-purple-500">
                    <button 
                    type="button" 
                    onClick={() => removeVariant(idx)}
                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                    >
                    <X className="w-4 h-4" />
                    </button>
                    <div className="grid gap-3 pr-6">
                    <Input 
                        placeholder="Nome (ex: Tam G)" 
                        value={variant.name}
                        onChange={e => updateVariant(idx, 'name', e.target.value)}
                        className="text-sm py-2.5 md:py-3"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input 
                        placeholder="SKU" 
                        value={variant.sku}
                        onChange={e => updateVariant(idx, 'sku', e.target.value)}
                        className="text-sm py-2.5 md:py-3"
                        />
                        <Input 
                        type="number"
                        placeholder="Preço" 
                        value={variant.sellValue}
                        onChange={e => updateVariant(idx, 'sellValue', parseFloat(e.target.value))}
                        className="text-sm py-2.5 md:py-3"
                        />
                    </div>
                    </div>
                </Card>
                ))}
                {(!form.variants || form.variants.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                        <AlertCircle className="w-6 h-6 md:w-8 md:h-8 mb-2 opacity-50" />
                        <span className="text-xs md:text-sm font-medium">Este produto não possui variações.</span>
                    </div>
                )}
            </div>
          </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50 md:static md:bg-transparent md:border-none md:shadow-none md:p-0">
           <Button type="submit" className="w-full shadow-xl shadow-emerald-600/20" isLoading={loading}>
            <Save className="w-5 h-5 mr-2" />
            Salvar Produto
          </Button>
        </div>
      </form>
    </div>
  );
};