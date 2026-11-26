import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

// The standard content card used on every page
export default function SectionCard({ title, description, actions, className, contentClassName, children }: Props) {
  return (
    <Card className={cn('gap-4 [--card-spacing:--spacing(5)]', className)}>
      {(title || description || actions) && (
        <CardHeader>
          {title && <CardTitle className="font-semibold">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
