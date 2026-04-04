import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[var(--teuco-border)] bg-white px-3 py-2 text-sm text-[var(--teuco-text)] transition-all placeholder:text-[var(--teuco-text-muted)] focus-visible:outline-none focus-visible:border-[var(--teuco-green)] focus-visible:ring-1 focus-visible:ring-[var(--teuco-green)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
