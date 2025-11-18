import React, { useState, useEffect } from 'react';
import { Api } from '../services/api';
import { Product } from '../types';
import { Card, PageHeader, Input, EmptyState } from '../components/UI';
import { Search, Plus, Package, Trash2, Tag, Sparkles } from 'lucide-react';

interface Props {
  onEdit: (id?: number) => void;
}

export const ProductList: React.FC<Props> = ({ onEdit }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await Api.Products.list();
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(window.confirm("Deletar este produto?")) {
        try {
            await Api.Products.delete(id);
            loadProducts();
        } catch(e) {
            alert("Não foi possível deletar o produto");
        }
    }
  }

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0 animate-in fade-in duration-500">
      <PageHeader 
        title="Meus Produtos"
        subtitle="Gerencie seu catálogo"
        action={
          <button onClick={() => onEdit()} className="group px-4 py-2 md:px-5 md:py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 font-bold text-xs md:text-sm">
            <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            <span className="hidden md:inline">Adicionar Produto</span>
            <span className="md:hidden">Novo</span>
          </button>
        } 
      />
      
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="relative max-w-lg mx-auto md:mx-0 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <Input 
                placeholder="Buscar produto..." 
                className="pl-10 md:pl-12 border-white bg-white/80 backdrop-blur shadow-lg shadow-slate-200/50" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 md:h-48 bg-slate-200/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState 
            title="Nenhum produto" 
            description={search ? `Nada para "${search}"` : "Seu catálogo está vazio."}
            icon={<Package />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {filtered.map((product, index) => (
              <Card 
                key={product.id} 
                className="p-0 flex md:flex-col group min-h-[auto] md:min-h-[200px] border-0 relative overflow-visible hover:z-10"
                onClick={() => onEdit(product.id)}
                hoverEffect={true}
              >
                {/* Desktop Background */}
                <div className="hidden md:block absolute inset-0 rounded-3xl bg-gradient-to-b from-white to-slate-50 -z-10"></div>
                
                {/* Mobile Content (Row Layout) */}
                <div className="md:hidden flex items-center gap-4 p-4 w-full">
                    <div className={`w-12 h-12 min-w-[3rem] rounded-xl flex items-center justify-center transition-colors duration-300 ${product.category ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 leading-tight truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="font-bold text-emerald-600">R$ {product.sellValue?.toFixed(2)}</span>
                             <span className="text-xs text-slate-300">•</span>
                             <span className={`text-xs font-medium ${product.minimumStock && product.minimumStock < 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                {product.minimumStock || 0} est.
                             </span>
                        </div>
                    </div>
                    {product.hasVariant && (
                         <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                             <Sparkles className="w-3 h-3" />
                         </div>
                    )}
                </div>

                {/* Desktop Content (Card Layout) */}
                <div className="hidden md:flex flex-col h-full">
                     <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${product.category ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                <Package className="w-6 h-6" />
                            </div>
                            {product.hasVariant && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                                    <Sparkles className="w-3 h-3" /> Variantes
                                </span>
                            )}
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors">{product.name}</h3>
                        
                        {product.category?.description && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                                <Tag className="w-3 h-3" />
                                {product.category.description}
                            </div>
                        )}
                    </div>

                    <div className="p-6 pt-0 mt-auto">
                        <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Estoque</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${product.minimumStock && product.minimumStock > 10 ? 'bg-emerald-400' : product.minimumStock && product.minimumStock > 0 ? 'bg-amber-400' : 'bg-red-400'}`}></div>
                                    <span className="font-bold text-sm text-slate-700">{product.minimumStock || 0}</span>
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                                R$ {product.sellValue?.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                 {/* Hover Actions (Desktop Only) */}
                 <button 
                    onClick={(e) => handleDelete(e, product.id!)} 
                    className="hidden md:block absolute top-4 right-4 p-2 bg-white text-red-400 rounded-xl shadow-lg shadow-red-100 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-red-50 hover:text-red-600 z-10"
                    title="Excluir"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};