import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      'animate-pulse rounded-xl bg-gradient-to-r from-[#F5F7FA] via-[#E9ECEF] to-[#F5F7FA] bg-[length:200%_100%]',
      className
    )} 
    {...props} 
  />
))
Skeleton.displayName = 'Skeleton'

export { Skeleton }
