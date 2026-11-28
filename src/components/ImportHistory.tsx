import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { FileSpreadsheet, History, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from './ConfirmDialog'
import { ErrorAlert } from './Feedback'
import SectionCard from './SectionCard'
import { Button } from '@/components/ui/button'
import { friendlyError } from '../lib/errors'
import { formatRM } from '../lib/format'
import { IMPORT_SOURCES, groupImports, type ImportBatch, type ImportedRow } from '../lib/importCheck'
import { SOURCES } from '../lib/importCsv'
import { beginLoad, refreshAll, useRefreshVersion } from '../lib/refresh'
import { supabase } from '../lib/supabase'
import { restoreRows, UNDO_MS } from '../lib/undo'

const SHOWN = 8
const sourceName = (s: string) => SOURCES.find((x) => x.value === s)?.label ?? 'Bank'
const span = (from: string, to: string) =>
  from === to ? format(parseISO(from), 'd MMM yyyy') : `${format(parseISO(from), 'd MMM')} – ${format(parseISO(to), 'd MMM yyyy')}`

// Statements imported before, worked out from the imported transactions themselves (each import
// saves its rows together), with a way to take a whole import back out
export default function ImportHistory() {
  const refreshVersion = useRefreshVersion()
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<{ batches: ImportBatch[] | null; error: string }>({ batches: null, error: '' })

  useEffect(() => {
    let ignore = false
    const done = beginLoad()
    supabase
      .from('transactions')
      .select('source, created_at, date, amount, type')
      .in('source', [...IMPORT_SOURCES])
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        done()
        if (ignore) return
        const rows = ((data ?? []) as ImportedRow[]).map((r) => ({ ...r, amount: Number(r.amount) }))
        setState({ batches: groupImports(rows), error: friendlyError(error) })
      })
    return () => {
      ignore = true
      done()
    }
  }, [version, refreshVersion])

  async function remove(b: ImportBatch) {
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('source', b.source)
      .gte('created_at', b.firstCreated)
      .lte('created_at', b.lastCreated)
      .select()
    if (error) return friendlyError(error)
    const rows = data ?? []
    toast(`Removed the ${sourceName(b.source)} import`, {
      description: `${rows.length} transaction${rows.length === 1 ? '' : 's'} from ${span(b.from, b.to)}`,
      duration: UNDO_MS,
      action: { label: 'Undo', onClick: () => void restoreRows('transactions', rows).then(() => setVersion((v) => v + 1)) },
    })
    setVersion((v) => v + 1)
    await refreshAll()
  }

  const { batches, error } = state
  if (batches !== null && batches.length === 0 && !error) return null

  return (
    <SectionCard title="Past imports" description="Statements you’ve imported, newest first" icon={History}>
      {error && <ErrorAlert message={error} />}
      {batches === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="-my-2 divide-y divide-border/70">
          {batches.slice(0, SHOWN).map((b) => (
            <li key={b.firstCreated + b.source} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <FileSpreadsheet className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-bold">
                  {sourceName(b.source)} · {b.count} transaction{b.count === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Imported {format(parseISO(b.importedAt), 'd MMM yyyy, h:mm a')} · covers {span(b.from, b.to)}
                </p>
                <p className="text-xs">
                  {b.income > 0 && <span className="font-semibold text-primary">+{formatRM(b.income)} in</span>}
                  {b.income > 0 && b.expenses > 0 && <span className="text-muted-foreground"> · </span>}
                  {b.expenses > 0 && <span className="font-semibold">−{formatRM(b.expenses)} out</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
                  <Link to={`/transactions?scope=dates&from=${b.from}&to=${b.to}`}>See those dates</Link>
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 /> Remove
                    </Button>
                  }
                  icon={Trash2}
                  destructive
                  title={`Remove this ${sourceName(b.source)} import?`}
                  description={`All ${b.count} transactions it added (${span(b.from, b.to)}) will be deleted, including any you’ve edited since. You can undo this for a few seconds afterwards, or import the file again.`}
                  confirmLabel={`Remove ${b.count} transaction${b.count === 1 ? '' : 's'}`}
                  onConfirm={() => remove(b)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {batches && batches.length > SHOWN && (
        <p className="mt-3 text-xs text-muted-foreground">Showing the latest {SHOWN} of {batches.length} imports.</p>
      )}
    </SectionCard>
  )
}
