import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Duolingo-style button: chunky, rounded, color-matched depth shadow.
// Hover lifts subtly, active compresses the depth (translateY + shadow
// collapses) — the same satisfying "press" feel as Duo's lesson UI.
// Sits intentionally against the brutalist card surfaces around it.
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display font-bold uppercase tracking-wide",
    "duo-btn",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:translate-y-1",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-0 duo-shadow-primary hover:bg-primary",
        destructive:
          "bg-destructive text-destructive-foreground border-0 duo-shadow-destructive hover:bg-destructive",
        success:
          "bg-success text-success-foreground border-0 duo-shadow-success hover:bg-success",
        warning:
          "bg-warning text-warning-foreground border-0 duo-shadow-warning hover:bg-warning",
        outline:
          "bg-card text-foreground border-2 border-border duo-shadow-outline hover:bg-card",
        secondary:
          "bg-secondary text-secondary-foreground border-0 duo-shadow-secondary hover:bg-secondary",
        // Foreground-filled: inverted CTA — ink button on paper bg, paper
        // button on ink bg. Useful as a high-contrast secondary action.
        foreground:
          "bg-foreground text-background border-0 duo-shadow-fg hover:bg-foreground",
        ghost:
          "rounded-[14px] border-0 shadow-none hover:bg-secondary hover:text-secondary-foreground hover:translate-y-0 active:translate-y-0",
        link:
          "border-0 shadow-none rounded-none underline-offset-4 hover:underline normal-case tracking-normal hover:translate-y-0 active:translate-y-0 text-primary",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-12 w-12 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
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
