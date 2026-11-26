import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A labelled form control. Wrapping in <label> ties the text to the control without ids.
export default function Field({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('grid min-w-0 grid-cols-1 content-start gap-1.5 text-sm', className)}>
      <span className="font-medium leading-none">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
