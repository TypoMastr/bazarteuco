import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { SelectHTMLAttributes, forwardRef } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string | number; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, options = [], children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-12 w-full appearance-none rounded-xl border-2 border-[#DEE2E6] bg-white px-4 py-3 pr-10 text-sm text-[#0f172a] ring-offset-white transition-all duration-200',
        'focus:outline-none focus:border-[#08A045] focus:ring-2 focus:ring-[#08A045]/20',
        'hover:border-[#CBD5E1]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F5F7FA]',
        className
      )}
      {...props}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {children}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none transition-transform" />
  </div>
))
Select.displayName = 'Select'

export { Select }
