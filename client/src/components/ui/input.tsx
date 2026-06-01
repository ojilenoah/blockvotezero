import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// Brutalist input: thick border, no radius, no inset shadow, mono font for inputs
// (great for addresses, NINs, etc).
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-border bg-background px-3 py-2 font-mono text-sm",
          "placeholder:text-muted-foreground/70 placeholder:font-sans",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-card",
          "transition-colors duration-75",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
