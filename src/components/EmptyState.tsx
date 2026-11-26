import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import monetraIcon from '../assets/monetra-icon.png'

// Friendly "nothing here yet" message with the Monetra squirrel
export default function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-8 text-center', className)}>
      <img src={monetraIcon} alt="" width={80} height={80} className="size-20 drop-shadow-sm" />
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  )
}
