import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--teuco-green)] disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider",
  {
    variants: {
      variant: {
        filled:
          "bg-[var(--teuco-green)] text-white shadow-sm hover:shadow-md",
        elevated:
          "bg-white text-[var(--teuco-green)] shadow-sm hover:shadow-md",
        tonal:
          "bg-[var(--teuco-green-soft)] text-[var(--teuco-green)] hover:bg-[var(--teuco-green-subtle)]",
        outlined:
          "border border-[var(--teuco-green)] bg-transparent text-[var(--teuco-green)] hover:bg-[var(--teuco-green)]/5",
        text:
          "bg-transparent text-[var(--teuco-green)] hover:bg-[var(--teuco-green)]/5",
        danger:
          "bg-red-500 text-white shadow-sm hover:bg-red-600",
        dangerTonal:
          "bg-red-50 text-red-600 hover:bg-red-100",
        // Mapping old names
        primary: "bg-[var(--teuco-green)] text-white",
        secondary: "bg-[var(--teuco-green-soft)] text-[var(--teuco-green)]",
        ghost: "bg-transparent text-[var(--teuco-green)] hover:bg-[var(--teuco-green)]/10",
        outline: "border border-[var(--teuco-green)] text-[var(--teuco-green)]",
        destructive: "bg-red-500 text-white",
      },
      size: {
        default: "h-10 px-5 rounded-lg",
        sm: "h-8 px-3 rounded-md text-[10px]",
        lg: "h-12 px-6 rounded-lg text-sm",
        icon: "h-10 w-10 rounded-lg",
        smIcon: "h-8 w-8 rounded-md",
        md: "h-10 px-5 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
