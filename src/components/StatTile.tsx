import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export type Delta = {
  // "+RM 300.00 vs October", shown beside the badge
  text: string
  direction: 'up' | 'down' | 'flat'
  // percent change for the badge; null when last month was zero
  pct?: number | null
  // whether this change is good news (more income, less spending)
  good?: boolean
}

type Props = {
  label: string
  value: string
  icon: LucideIcon
  // colour of the matching chart series; the icon chip carries it so the value stays in text ink
  keyColor?: string
  delta?: Delta
  detail?: string
}

export default function StatTile({ label, value, icon: Icon, keyColor, delta, detail }: Props) {
  const Arrow = delta?.direction === 'up' ? ArrowUp : delta?.direction === 'down' ? ArrowDown : Minus
  const tone =
    !delta || delta.direction === 'flat' || delta.good === undefined
      ? 'bg-muted text-muted-foreground'
      : delta.good
        ? 'bg-secondary text-primary'
        : 'bg-destructive/10 text-destructive'

  return (
    <Card size="sm" className="gap-3 px-4 py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"
          style={keyColor ? { backgroundColor: `color-mix(in srgb, ${keyColor} 16%, var(--card))`, color: keyColor } : undefined}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <p className="text-sm leading-tight font-semibold text-muted-foreground">{label}</p>
      </div>
      <div>
        <p className="text-lg font-extrabold tracking-tight whitespace-nowrap sm:text-2xl">{value}</p>
        {delta && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {delta.pct != null ? (
              <>
                <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold', tone)}>
                  <Arrow className="size-3" aria-hidden="true" />
                  {Math.abs(delta.pct).toFixed(1)}%
                </span>
                {delta.text}
              </>
            ) : (
              // no percentage: keep the arrow glued to the start of the text
              <span>
                {delta.direction !== 'flat' && <Arrow className="mr-0.5 inline size-3 align-[-2px]" aria-hidden="true" />}
                {delta.text}
              </span>
            )}
          </p>
        )}
        {detail && <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </Card>
  )
}
