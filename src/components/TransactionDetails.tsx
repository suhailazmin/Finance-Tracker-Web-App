import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Pencil, Search, Trash2, X } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatRM } from '../lib/format'
import { sourceText } from '../lib/sourceText'
import type { Category, Transaction } from '../lib/types'

type Props = {
  transaction: Transaction | null
  category?: Category
  // search link for "more from this merchant"
  merchant: { label: string; to: string }
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

// Everything about one transaction: a bottom sheet on phones, a centred dialog on larger screens
export default function TransactionDetails({ transaction: t, category, merchant, onOpenChange, onEdit, onDelete }: Props) {
  const pending = t?.source === 'pending'
  return (
    <DialogPrimitive.Root open={t !== null} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90svh] overflow-y-auto rounded-t-3xl bg-popover p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-popover-foreground ring-1 ring-foreground/10 outline-none',
            'duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0'
          )}
        >
          {t && (
            <>
              {/* grab handle, phones only */}
              <div className="mx-auto -mt-1 mb-4 h-1.5 w-10 rounded-full bg-muted sm:hidden" aria-hidden="true" />
              <div className="flex items-start gap-3">
                <CategoryIcon category={category} className="size-11" />
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="text-base font-bold wrap-break-word">{t.description}</DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm text-muted-foreground">
                    {format(parseISO(t.date), 'EEEE, d MMMM yyyy')}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close" className="-mt-1 -mr-2 text-muted-foreground">
                    <X />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <p className={cn('mt-4 text-3xl font-extrabold tracking-tight', t.type === 'income' ? 'text-primary' : 'text-foreground')}>
                {t.type === 'income' ? '+' : '−'}
                {formatRM(t.amount)}
              </p>

              <dl className="mt-4 divide-y divide-border/70 rounded-xl bg-muted/50 px-4 text-sm">
                <Row label="Type">{t.type === 'income' ? 'Income' : 'Expense'}</Row>
                <Row label="Category">{category?.name ?? 'Uncategorized'}</Row>
                <Row label="Date">{format(parseISO(t.date), 'd MMM yyyy')}</Row>
                <Row label="Source">{sourceText(t.source)}</Row>
                {t.created_at && <Row label="Added on">{format(parseISO(t.created_at), 'd MMM yyyy, h:mm a')}</Row>}
              </dl>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {/* queued offline entries can't be edited until they've synced */}
                <Button onClick={onEdit} disabled={pending}>
                  <Pencil /> Edit
                </Button>
                <Button variant="outline" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 /> Delete
                </Button>
                <Button asChild variant="ghost" className="text-primary hover:text-primary">
                  <Link to={merchant.to} onClick={() => onOpenChange(false)}>
                    <Search /> {merchant.label}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}
