import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Package, Layers, Settings, Store, Zap } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Layout: React.FC<Props> = ({ children, currentView, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />, label: 'Visão Geral' },
    { id: 'products', icon: <Package className="w-5 h-5 md:w-6 md:h-6" />, label: 'Produtos' },
    { id: 'categories', icon: <Layers className="w-5 h-5 md:w-6 md:h-6" />, label: 'Categorias' },
    { id: 'settings', icon: <Settings className="w-5 h-5 md:w-6 md:h-6" />, label: 'Ajustes' },
  ];

  const isFullScreen = ['product-form', 'category-form'].includes(currentView.name);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900 font-sans overflow-hidden">
      
      {/* Ambient Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-60 md:opacity-100">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/20 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-200/20 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      </div>

      {/* Sidebar Navigation (Desktop/Tablet) */}
      <aside className={`hidden md:flex flex-col w-72 h-[96vh] my-[2vh] ml-4 bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 rounded-3xl fixed z-40 transition-all duration-300`}>
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 transform transition-transform hover:rotate-12">
             <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
             <h1 className="font-bold text-xl tracking-tight text-slate-900">SmartPOS</h1>
             <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Manager Pro</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(item => {
            const isActive = currentView.name === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate({ name: item.id as any })}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'text-emerald-700 bg-emerald-50 shadow-inner' 
                    : 'text-slate-500 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:text-slate-900'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-full" />}
                <span className={`transition-all duration-300 ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-emerald-500 group-hover:scale-110'}`}>
                    {item.icon}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-10 -mt-10"></div>
             <p className="text-xs font-medium text-slate-300 mb-1">Status da API</p>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold">Online</span>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-500 w-full ${!isFullScreen ? 'md:ml-[20rem]' : ''} relative z-10`}>
         <div className="max-w-[1600px] mx-auto h-full min-h-screen flex flex-col">
            {children}
         </div>
      </main>

      {/* Bottom Navigation (Mobile Only) - Optimized for vertical space */}
      {!isFullScreen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] pt-1 px-2 flex justify-around items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          {navItems.map(item => {
            const isActive = currentView.name === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => onNavigate({ name: item.id as any })}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`transition-all duration-300 ${isActive ? '-translate-y-0.5 drop-shadow-sm' : ''}`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { 
                    className: isActive ? "fill-current w-6 h-6" : "w-6 h-6"
                  })}
                </div>
                <span className={`text-[10px] font-bold transition-all duration-200 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  );
};