import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost', isLoading?: boolean }> = ({ 
  className = '', 
  variant = 'primary', 
  isLoading, 
  children, 
  disabled,
  ...props 
}) => {
  // Reduced padding for mobile (py-3 vs py-3.5, px-5 vs px-6)
  const baseStyle = "inline-flex items-center justify-center px-4 py-3 md:px-6 md:py-3.5 rounded-2xl font-bold tracking-wide transition-all duration-300 ease-out transform active:scale-[0.96] focus:outline-none focus:ring-4 focus:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 text-sm md:text-base";
  
  const variants = {
    primary: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 focus:ring-emerald-500/30",
    secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200/50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 focus:ring-red-500/20",
    ghost: "text-slate-500 hover:bg-slate-100/50 hover:text-slate-900"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span>Processando...</span>
        </>
      ) : children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }> = ({ label, error, className = '', ...props }) => (
  <div className="w-full group relative">
    {label && (
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1 group-focus-within:text-emerald-600 transition-colors duration-300">
        {label}
      </label>
    )}
    <div className="relative">
      <input 
        className={`w-full px-4 py-3 md:px-5 md:py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 placeholder:text-slate-300 font-medium outline-none transition-all duration-300 ease-out focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm hover:border-slate-200 text-sm md:text-base ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && (
      <div className="flex items-center gap-1 mt-1.5 ml-1 text-red-500 animate-in slide-in-from-left-2 fade-in duration-300">
        <span className="text-xs font-bold">{error}</span>
      </div>
    )}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void, hoverEffect?: boolean, style?: React.CSSProperties }> = ({ children, className = '', onClick, hoverEffect = false, style }) => (
  <div 
    onClick={onClick} 
    className={`
      bg-white/70 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 
      transition-all duration-500 ease-out 
      ${onClick || hoverEffect ? 'hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 hover:-translate-y-1 cursor-pointer' : ''} 
      ${className}
    `}
    style={style}
  >
    {children}
  </div>
);

export const PageHeader: React.FC<{ title: string, subtitle?: string, action?: React.ReactNode, onBack?: () => void }> = ({ title, subtitle, action, onBack }) => (
  <div className="sticky top-0 z-30 bg-[#F8FAFC]/90 backdrop-blur-xl px-4 py-4 md:px-6 md:py-8 flex items-center justify-between transition-all duration-300 border-b border-slate-200/50 md:border-none">
    <div className="flex items-center gap-3 md:gap-4">
      {onBack && (
        <button onClick={onBack} className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-300 shadow-sm group">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-0.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}
      <div>
        <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-slate-400 font-medium mt-0.5 md:mt-1 text-xs md:text-sm">{subtitle}</p>}
      </div>
    </div>
    <div className="animate-in fade-in slide-in-from-right-4 duration-700">
      {action}
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string, description: string, icon: React.ReactNode }> = ({ title, description, icon }) => (
  <div className="flex flex-col items-center justify-center py-12 md:py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-700">
    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-slate-100 to-white rounded-3xl shadow-inner border border-white flex items-center justify-center text-slate-300 mb-6 transition-transform duration-700 hover:scale-110 hover:rotate-6 group">
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-8 h-8 md:w-10 md:h-10 group-hover:text-emerald-500 transition-colors duration-500" })}
    </div>
    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 font-medium max-w-xs leading-relaxed text-sm md:text-base">{description}</p>
  </div>
);