import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Decorative tints from the Monetra logo; they label the card, they don't encode data
const tones = {
  green: 'bg-secondary text-primary',
  orange: 'bg-brand-orange/20 text-brand-orange-ink',
} as const

export type Tone = keyof typeof tones

type Props = {
  // lets other parts of the page link here (#id); leaves room for the sticky header
  id?: string
  title?: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  actions?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}

// The standard content card used on every page
export default function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  tone = 'green',
  actions,
  className,
  contentClassName,
  children,
}: Props) {
  return (
    <Card id={id} className={cn('scroll-mt-24 gap-4 [--card-spacing:--spacing(5)]', className)}>
      {(title || description || actions) && (
        <CardHeader className={cn(Icon && 'grid-cols-[auto_1fr] gap-x-3 has-data-[slot=card-action]:grid-cols-[auto_1fr_auto]')}>
          {Icon && (
            <span
              className={cn('flex size-9 items-center justify-center rounded-xl', description && 'row-span-2', tones[tone])}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
          )}
          {title && <CardTitle className="self-center text-base font-bold">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {actions && <CardAction className={cn(Icon && 'col-start-3')}>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
