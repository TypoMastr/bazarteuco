import React, { useState, useEffect } from 'react';
import { Api } from '../services/api';
import { Category } from '../types';
import { Card, PageHeader, Input, EmptyState } from '../components/UI';
import { Search, Plus, FolderOpen, Trash2, ChevronRight } from 'lucide-react';

interface Props {
    onEdit: (id?: number) => void;
}

export const CategoryList: React.FC<Props> = ({onEdit}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
      setLoading(true);
      try {
        const data = await Api.Categories.list();
        setCategories(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm("Deletar categoria?")) {
        await Api.Categories.delete(id);
        loadData();
    }
  }

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0 animate-in fade-in duration-500">
      <PageHeader 
        title="Categorias" 
        action={
          <button onClick={() => onEdit()} className="p-2.5 md:p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline font-medium">Nova Categoria</span>
          </button>
        }
      />
      
      <div className="p-4 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Buscar categorias..." 
            className="pl-12" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
             {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
           <EmptyState 
            title="Nenhuma categoria" 
            description="Organize seus produtos criando categorias"
            icon={<FolderOpen />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((cat, index) => (
              <Card 
                key={cat.id} 
                className="p-4 flex items-center justify-between group hover:border-emerald-300 active:scale-98" 
                onClick={() => onEdit(cat.id)}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: cat.color || '#10b981' }}
                  >
                     <FolderOpen className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-bold text-slate-900 text-base md:text-lg">{cat.name}</span>
                     <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">Editar</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => handleDelete(e, cat.id!)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};