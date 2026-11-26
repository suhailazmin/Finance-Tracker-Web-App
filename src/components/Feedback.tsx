import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Page-level load/save error
export function ErrorAlert({ message, className }: { message: string; className?: string }) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

// One-line result under a form: green when it worked, red when it didn't
export function FormMessage({ ok = false, children, className }: { ok?: boolean; children: ReactNode; className?: string }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={cn('text-sm', ok ? 'text-primary' : 'text-destructive', className)}>
      {children}
    </p>
  )
}
