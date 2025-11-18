import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Api } from '../services/api';
import { Sale } from '../types';
import { Card, EmptyState } from '../components/UI';
import { DollarSign, ShoppingBag, AlertCircle, Calendar, Trophy, ChevronRight, ArrowLeft, List, Package, ChevronDown } from 'lucide-react';

interface AggregatedItem {
  productId: number;
  productName: string;
  quantity: number;
  totalValue: number;
}

export const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  });

  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const data = await Api.Sales.list();
        setSales(data);
      } catch (e) {
        setError('Falha ao carregar vendas.');
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  const dailySales = useMemo(() => {
    return sales.filter(s => 
      s.creationDate.startsWith(selectedDate) && !s.isCanceled
    );
  }, [sales, selectedDate]);

  const totalRevenue = dailySales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalTransactions = dailySales.length;

  const aggregatedItems = useMemo(() => {
    const map = new Map<number, AggregatedItem>();

    dailySales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const pid = item.product.id || 0;
          const existing = map.get(pid);
          
          if (existing) {
            existing.quantity += item.quantity;
            existing.totalValue += item.netItem;
          } else {
            map.set(pid, {
              productId: pid,
              productName: item.product.name,
              quantity: item.quantity,
              totalValue: item.netItem
            });
          }
        });
      }
    });

    return Array.from(map.values());
  }, [dailySales]);

  const topItems = useMemo(() => {
    return [...aggregatedItems]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [aggregatedItems]);

  const handleDateClick = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch (err) {
          // Fallback if showPicker fails or is not allowed
          dateInputRef.current.click();
        }
      } else {
        // Fallback for older browsers
        dateInputRef.current.focus();
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
            <div className="h-8 w-32 bg-slate-200/50 rounded-xl animate-pulse"></div>
            <div className="h-10 w-40 bg-slate-200/50 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-slate-200/50 rounded-3xl animate-pulse"></div>
          <div className="h-48 bg-slate-200/50 rounded-3xl animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-200/50 rounded-3xl animate-pulse mt-8"></div>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Erro de Conexão" description={error} icon={<AlertCircle />} />;
  }

  // --- DETAILED REPORT VIEW ---
  if (viewMode === 'details') {
    return (
      <div className="h-full flex flex-col pb-20 md:pb-0 animate-in slide-in-from-right-8 duration-500 ease-out bg-[#F8FAFC]">
        <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4 md:px-8 md:py-6 flex items-center gap-4">
            <button onClick={() => setViewMode('summary')} className="group p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 transition-all duration-300">
                <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
            </button>
            <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900">Relatório Detalhado</h1>
                <p className="text-xs md:text-sm font-medium text-slate-500 capitalize">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>
        </div>

        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div className="p-5 md:p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col justify-center">
                    <span className="text-[10px] md:text-xs font-bold uppercase text-emerald-600 tracking-widest mb-1">Total Itens</span>
                    <div className="text-2xl md:text-3xl font-black text-emerald-900">
                        {aggregatedItems.reduce((acc, item) => acc + item.quantity, 0)}
                    </div>
                </div>
                <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Ticket Médio</span>
                    <div className="text-2xl md:text-3xl font-black text-slate-900">
                        R$ {totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-slate-900 text-sm md:text-base uppercase tracking-wide">Vendas por Produto</h3>
                </div>
                
                {aggregatedItems.length === 0 ? (
                     <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <ShoppingBag className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium text-sm">Nenhuma venda registrada.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                        {aggregatedItems.sort((a,b) => b.totalValue - a.totalValue).map((item, idx) => (
                            <div 
                                key={item.productId} 
                                className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors duration-200"
                            >
                                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-600 font-bold text-xs">
                                        {item.quantity}x
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-900 text-sm md:text-base truncate">{item.productName}</div>
                                        <div className="text-[10px] md:text-xs font-medium text-slate-400">
                                            Unit. Médio: R$ {(item.totalValue / item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <div className="font-bold text-emerald-600 text-sm md:text-base">R$ {item.totalValue.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    )
  }

  // --- SUMMARY VIEW ---
  return (
    <div className="h-full flex flex-col pb-20 md:pb-0 animate-in fade-in duration-700">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-xl px-4 py-4 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 border-b border-slate-200/50 md:border-none">
        <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Visão Geral</h1>
            <p className="text-slate-400 font-medium text-xs md:text-sm mt-0.5">Acompanhe o desempenho diário</p>
        </div>
        
        {/* Date Picker Button - Uses label for better hit area and ref for programmatic open */}
        <label className="relative group w-full md:w-auto cursor-pointer">
            <div 
                className="flex items-center justify-between md:justify-start gap-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200 group-active:scale-95 group-active:border-emerald-400 transition-all duration-200 select-none hover:border-emerald-300"
                onClick={handleDateClick}
            >
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <span className="font-bold text-slate-700 text-sm capitalize">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            
            {/* Native Input - Positioned absolutely to cover or be accessible */}
            <input 
                ref={dateInputRef}
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                required
            />
        </label>
      </div>
      
      <div className="p-4 md:p-8 space-y-4 md:space-y-8 max-w-6xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
            {/* Revenue Card */}
            <Card className="col-span-1 p-4 md:p-8 bg-gradient-to-br from-emerald-500 to-teal-600 border-none text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 h-full flex flex-col justify-between min-h-[80px] md:min-h-[120px]">
                    <div className="flex items-center gap-2 opacity-90">
                        <div className="p-1 bg-white/20 rounded-lg backdrop-blur-sm">
                             <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                        </div>
                        <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Receita</span>
                    </div>
                    <div className="mt-2 md:mt-4">
                         <div className="text-2xl md:text-5xl font-black tracking-tight">
                            <span className="text-sm md:text-2xl opacity-80 font-bold mr-1">R$</span>
                            {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Transactions Card */}
            <Card className="col-span-1 p-4 md:p-8 bg-white border border-slate-200 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all relative overflow-hidden">
                <div className="relative z-10 h-full flex flex-col justify-between min-h-[80px] md:min-h-[120px]">
                    <div className="flex items-center gap-2 text-slate-400">
                        <div className="p-1 bg-slate-100 rounded-lg">
                             <ShoppingBag className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />
                        </div>
                        <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Vendas</span>
                    </div>
                    <div className="mt-2 md:mt-4">
                        <div className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight">
                            {totalTransactions}
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-1">Transações hoje</p>
                    </div>
                </div>
            </Card>
        </div>

        {/* Top Items Section */}
        <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Destaques
                </h2>
            </div>
            
            {topItems.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium text-sm">Nenhuma venda registrada hoje</p>
                </div>
            ) : (
                <div className="grid gap-2 md:gap-3 md:grid-cols-3">
                     {topItems.map((item, index) => (
                        <Card key={item.productId} className="p-3 md:p-6 flex md:flex-col items-center md:items-start justify-between md:justify-center gap-4 border border-slate-100 relative overflow-hidden">
                             {/* Rank Badge */}
                             <div className={`absolute top-0 left-0 w-1 h-full md:w-full md:h-1 ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-300' : 'bg-orange-300'}`}></div>
                             
                             <div className="flex items-center gap-3 md:w-full">
                                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-lg shadow-sm flex-shrink-0 ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                                    #{index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm md:text-lg leading-tight truncate md:whitespace-normal md:line-clamp-2">{item.productName}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 md:mt-1 font-medium">{item.quantity} un.</p>
                                </div>
                            </div>
                            <div className="md:w-full md:pt-4 md:border-t md:border-slate-100 md:mt-2 flex-shrink-0">
                                <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase hidden md:block mb-1">Total Gerado</div>
                                <div className="font-black text-emerald-600 text-sm md:text-xl whitespace-nowrap">R$ {item.totalValue.toFixed(0)}</div>
                            </div>
                        </Card>
                     ))}
                </div>
            )}
        </div>

        {/* Action Button */}
        {topItems.length > 0 && (
             <div className="pt-1 md:pt-4 pb-4">
                <button 
                    onClick={() => setViewMode('details')}
                    className="w-full md:w-auto group relative px-6 py-3 md:py-4 bg-white border border-slate-200 text-emerald-700 rounded-2xl font-bold shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md active:scale-98 transition-all duration-300 flex items-center justify-center gap-3 mx-auto text-sm md:text-base"
                >
                    <List className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Ver Lista Completa</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400 transition-transform group-hover:translate-x-1" />
                </button>
             </div>
        )}
      </div>
    </div>
  );
};