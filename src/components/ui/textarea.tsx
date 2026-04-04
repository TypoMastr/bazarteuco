import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[100px] w-full rounded-xl border-2 border-[#DEE2E6] bg-white px-4 py-3 text-sm text-[#0f172a] ring-offset-white placeholder:text-[#64748B] transition-all duration-200 resize-none',
      'focus:outline-none focus:border-[#08A045] focus:ring-2 focus:ring-[#08A045]/20',
      'hover:border-[#CBD5E1]',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F5F7FA]',
      className
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
