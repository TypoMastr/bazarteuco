import React, { useState, useEffect } from 'react';
import { Api } from '../services/api';
import { Category } from '../types';
import { PageHeader, Button, Input } from '../components/UI';

interface Props {
  categoryId?: number;
  onBack: () => void;
  onSave: () => void;
}

export const CategoryForm: React.FC<Props> = ({ categoryId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Category>({ name: '' });

  useEffect(() => {
    if (categoryId) {
      Api.Categories.get(categoryId).then(setForm).catch(console.error);
    }
  }, [categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (categoryId) {
        await Api.Categories.update(categoryId, form);
      } else {
        await Api.Categories.create(form);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title={categoryId ? "Editar Categoria" : "Nova Categoria"} onBack={onBack} />
      <form onSubmit={handleSubmit} className="p-4 md:p-8 flex-1 max-w-2xl mx-auto w-full">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Detalhes</h2>
            </div>
            <Input 
                label="Nome da Categoria" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                required
                placeholder="Ex: Bebidas, Roupas..."
            />
        </div>
        <div className="mt-6">
            <Button type="submit" className="w-full shadow-xl shadow-emerald-600/20" isLoading={loading}>
                {categoryId ? 'Atualizar Categoria' : 'Criar Categoria'}
            </Button>
        </div>
      </form>
    </div>
  );
};