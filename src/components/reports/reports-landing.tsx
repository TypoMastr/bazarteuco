'use client'
import { Calendar, BarChart3, TrendingUp, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function ReportsLanding() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const options = [
    {
      href: '/reports/daily',
      icon: Calendar,
      title: 'DIÁRIO',
      description: 'Relatório detalhado do dia selecionado',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      href: '/reports/monthly',
      icon: BarChart3,
      title: 'MENSAL',
      description: 'Resumo consolidado do mês selecionado',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      href: '/reports/annual',
      icon: TrendingUp,
      title: 'ANUAL',
      description: 'Resumo consolidado do ano selecionado',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ]

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-black tracking-tight text-[var(--teuco-green)] uppercase">
            Relatório <span className="opacity-50">de Vendas</span>
          </h1>
          <p className="text-xs text-[var(--teuco-text-muted)] mt-1">Selecione o tipo de relatório</p>
        </div>
        <button
          onClick={handleLogout}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-colors shrink-0 ml-3"
        >
          <LogOut className="h-4 w-4 text-red-500" />
          <span className="text-xs font-bold text-red-500">Sair</span>
        </button>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className={`block p-5 rounded-xl border-2 ${option.bgColor} ${option.borderColor} hover:shadow-lg transition-all active:scale-95`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${option.iconBg} flex items-center justify-center shrink-0`}>
                <option.icon className={`h-7 w-7 ${option.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-[var(--teuco-text)] uppercase">{option.title}</h3>
                <p className="text-xs text-[var(--teuco-text-muted)] mt-0.5">{option.description}</p>
              </div>
              <svg className={`h-5 w-5 ${option.iconColor} opacity-50`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
