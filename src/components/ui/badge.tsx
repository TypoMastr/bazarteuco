import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--teuco-green)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--teuco-green)] text-white shadow-sm",
        secondary:
          "border-transparent bg-[var(--teuco-green-soft)] text-[var(--teuco-green)]",
        destructive:
          "border-transparent bg-red-100 text-red-700",
        success:
          "border-transparent bg-emerald-100 text-emerald-800",
        warning:
          "border-transparent bg-amber-100 text-amber-900",
        info:
          "border-transparent bg-blue-100 text-blue-800",
        outline: "text-[var(--teuco-text)] border-[var(--teuco-border)] bg-white",
      },
      size: {
        sm: "h-5 px-2 text-[9px]",
        default: "h-7 px-3 py-1",
        lg: "h-9 px-4 text-xs",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
