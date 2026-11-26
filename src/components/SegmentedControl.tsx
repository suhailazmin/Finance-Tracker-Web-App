import { cn } from '@/lib/utils'

type Option<T> = { value: T; label: string; activeClassName?: string }

// Two or three mutually exclusive choices shown side by side
export default function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
  label,
}: {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
  label?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1 text-sm', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md px-3 py-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active ? cn('bg-background font-medium shadow-sm', o.activeClassName) : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
