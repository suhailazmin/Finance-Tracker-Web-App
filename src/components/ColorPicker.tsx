import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_COLORS } from '../lib/categoryColors'

export default function ColorPicker({
  value,
  onChange,
  label = 'Colour',
}: {
  value: string
  onChange: (color: string) => void
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((c) => {
        const selected = c.value.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={cn(
              'flex size-8 items-center justify-center rounded-full text-white transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'scale-110 ring-2 ring-foreground/70 ring-offset-2 ring-offset-card' : 'hover:scale-105'
            )}
            style={{ backgroundColor: c.value }}
          >
            {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
