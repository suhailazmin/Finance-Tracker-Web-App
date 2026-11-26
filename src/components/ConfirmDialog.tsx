import { useState, type ReactElement, type ReactNode } from 'react'
import { CircleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  description: ReactNode
  confirmLabel: string
  // runs when confirmed; return an error message to keep the dialog open and show it
  onConfirm: () => Promise<string | undefined | void> | string | undefined | void
  destructive?: boolean
  icon?: LucideIcon
  // either pass a trigger element, or control `open` yourself (e.g. from a menu item)
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// "Are you sure?" pop-up used before signing out, deleting, and other hard-to-undo actions
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  icon: Icon = CircleAlert,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const open = controlledOpen ?? uncontrolledOpen

  function setOpen(next: boolean) {
    if (busy) return // don't close mid-request
    if (!next) setError('')
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  async function confirm() {
    setBusy(true)
    setError('')
    const message = await onConfirm()
    setBusy(false)
    if (message) {
      setError(message)
    } else {
      setUncontrolledOpen(false)
      onOpenChange?.(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn('rounded-xl', destructive ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary')}
          >
            <Icon />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter className="rounded-b-2xl">
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {/* a plain Button, so the dialog stays open while the request runs */}
          <Button
            disabled={busy}
            onClick={confirm}
            className={cn(destructive && 'bg-destructive text-white hover:bg-destructive/90')}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
