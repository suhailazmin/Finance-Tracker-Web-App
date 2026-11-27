import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setAmountsHidden, useAmountsHidden } from '../lib/privacy'

// Eye toggle for privacy mode; the same setting everywhere it appears
export default function HideAmountsButton({ className }: { className?: string }) {
  const hidden = useAmountsHidden()
  const Icon = hidden ? EyeOff : Eye

  return (
    <button
      type="button"
      onClick={() => setAmountsHidden(!hidden)}
      aria-pressed={hidden}
      aria-label="Hide amounts"
      title={hidden ? 'Show amounts' : 'Hide amounts'}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  )
}
