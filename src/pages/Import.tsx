import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Columns3, FileSpreadsheet, ListChecks, Upload } from 'lucide-react'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { findRule } from '../lib/categorize'
import { formatRM } from '../lib/format'
import {
  MAX_ROWS,
  SOURCES,
  buildRows,
  guessMapping,
  readCsv,
  withImportHashes,
  type Mapping,
  type ParsedRow,
  type Sheet,
  type Source,
} from '../lib/importCsv'
import { supabase } from '../lib/supabase'
import type { Category, CategoryRule, TransactionType } from '../lib/types'

const MAX_FILE_BYTES = 5 * 1024 * 1024

type Done = { imported: number; duplicates: number }

export default function Import() {
  const { categories } = useCategories()
  const { rules } = useCategoryRules()
  const [source, setSource] = useState<Source>('generic')
  const [file, setFile] = useState<{ name: string; sheet: Sheet } | null>(null)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [readError, setReadError] = useState('')
  const [done, setDone] = useState<Done | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function choose(f: File | undefined) {
    if (!f) return
    setReadError('')
    setDone(null)
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      return setReadError('Please choose a .csv file. PDF and Excel statements aren’t supported yet; most banks can also export CSV.')
    }
    if (f.size > MAX_FILE_BYTES) return setReadError('That file is over 5 MB. Try exporting a shorter date range.')
    const sheet = readCsv(await f.text())
    if (!sheet || sheet.rows.length === 0) {
      return setReadError('Couldn’t find any rows in that file. Check it’s the CSV export of your statement.')
    }
    if (sheet.rows.length > MAX_ROWS) {
      return setReadError(`That file has ${sheet.rows.length} rows. Import up to ${MAX_ROWS} at a time by exporting a shorter date range.`)
    }
    setFile({ name: f.name, sheet })
    setMapping(guessMapping(sheet))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    choose(e.dataTransfer.files[0])
  }

  function reset() {
    setFile(null)
    setMapping(null)
    setDone(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import statement"
        description="Add many transactions at once from your bank or e-wallet’s CSV export."
        actions={
          <Button asChild variant="outline">
            <Link to="/transactions">
              <ArrowLeft /> Transactions
            </Link>
          </Button>
        }
      />

      {done ? (
        <Card>
          <EmptyState
            title={`Imported ${done.imported} transaction${done.imported === 1 ? '' : 's'}`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/transactions">See transactions</Link>
                </Button>
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
              </div>
            }
          >
            {done.duplicates > 0
              ? `${done.duplicates} ${done.duplicates === 1 ? 'was' : 'were'} already in Monetra and ${done.duplicates === 1 ? 'was' : 'were'} skipped.`
              : 'They now appear in the months they happened in.'}
          </EmptyState>
        </Card>
      ) : (
        <>
          <SectionCard title="1. Choose your statement" icon={Upload}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Field label="Which account is it from?">
                <NativeSelect className="w-full" value={source} onChange={(e) => setSource(e.target.value as Source)}>
                  {SOURCES.map((s) => (
                    <NativeSelectOption key={s.value} value={s.value}>
                      {s.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <label
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50',
                  dragOver ? 'border-primary bg-secondary' : 'border-border hover:border-primary/50 hover:bg-muted/40'
                )}
              >
                <FileSpreadsheet className="size-8 text-primary" aria-hidden="true" />
                <span className="text-sm font-bold">{file ? file.name : 'Choose a CSV file'}</span>
                <span className="text-xs text-muted-foreground">
                  {file ? `${file.sheet.rows.length} rows · tap to choose a different file` : 'Tap to browse, or drop the file here'}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    choose(e.target.files?.[0])
                    e.target.value = '' // allow choosing the same file again
                  }}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Download your transaction history as <strong>CSV</strong> from your bank or e-wallet’s website or app. Your file is read
              on this device; only the transactions you import are saved.
            </p>
            {readError && <FormMessage className="mt-3">{readError}</FormMessage>}
          </SectionCard>

          {file && mapping && (
            <>
              <SectionCard
                title="2. Check the columns"
                description="We guessed which column is which. Fix anything that looks wrong."
                icon={Columns3}
                tone="orange"
              >
                <ColumnMapping sheet={file.sheet} mapping={mapping} onChange={setMapping} />
              </SectionCard>

              <Review
                // start fresh (ticks, categories) whenever the columns change
                key={JSON.stringify(mapping)}
                sheet={file.sheet}
                mapping={mapping}
                source={source}
                categories={categories}
                rules={rules}
                onDone={setDone}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---------- step 2 ----------

function ColumnMapping({ sheet, mapping, onChange }: { sheet: Sheet; mapping: Mapping; onChange: (m: Mapping) => void }) {
  const set = (patch: Partial<Mapping>) => onChange({ ...mapping, ...patch })


  const howToRead = mapping.mode === 'unsigned' ? 'unsigned' : mapping.negativeIsOut ? 'minus-out' : 'minus-in'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <ColumnSelect sheet={sheet} value={mapping.date} onPick={(date) => set({ date })} />
        </Field>
        <Field label="Description">
          <ColumnSelect sheet={sheet} value={mapping.description} onPick={(description) => set({ description })} />
        </Field>
        <Field label="Extra details (optional)" hint="Added after the description.">
          <ColumnSelect sheet={sheet} optional value={mapping.extraDescription} onPick={(extraDescription) => set({ extraDescription })} />
        </Field>
        <Field label="Type column (optional)" hint="A column like DR/CR, Payment or Reload.">
          <ColumnSelect sheet={sheet} optional value={mapping.direction} onPick={(direction) => set({ direction })} />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Amounts</p>
        <SegmentedControl
          label="How amounts are laid out"
          className="sm:max-w-md"
          value={mapping.mode === 'split' ? 'split' : 'single'}
          onChange={(v) => set({ mode: v === 'split' ? 'split' : mapping.mode === 'split' ? 'signed' : mapping.mode })}
          options={[
            { value: 'single', label: 'One amount column' },
            { value: 'split', label: 'Money out & in columns' },
          ]}
        />
      </div>

      {mapping.mode === 'split' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Money out (debit)">
            <ColumnSelect sheet={sheet} value={mapping.moneyOut} onPick={(moneyOut) => set({ moneyOut })} />
          </Field>
          <Field label="Money in (credit)">
            <ColumnSelect sheet={sheet} value={mapping.moneyIn} onPick={(moneyIn) => set({ moneyIn })} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount">
            <ColumnSelect sheet={sheet} value={mapping.amount} onPick={(amount) => set({ amount })} />
          </Field>
          <Field label="How to tell money in from money out" hint="CR/DR markers and the type column always win.">
            <NativeSelect
              className="w-full"
              value={howToRead}
              onChange={(e) => {
                const v = e.target.value
                set(v === 'unsigned' ? { mode: 'unsigned' } : { mode: 'signed', negativeIsOut: v === 'minus-out' })
              }}
            >
              <NativeSelectOption value="minus-out">Minus means money out</NativeSelectOption>
              <NativeSelectOption value="minus-in">Minus means money in</NativeSelectOption>
              <NativeSelectOption value="unsigned">No signs: treat as money out</NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>
      )}
    </div>
  )
}

// Column picker; each option shows "Header (e.g. first value)" so it's obvious which column is which
function ColumnSelect({
  sheet,
  value,
  onPick,
  optional,
}: {
  sheet: Sheet
  value: number
  onPick: (i: number) => void
  optional?: boolean
}) {
  const example = (i: number) => {
    const sample = sheet.rows.slice(0, 8).map((r) => r[i]).find(Boolean)
    return sample ? ` (e.g. ${sample.length > 22 ? sample.slice(0, 21) + '…' : sample})` : ''
  }
  return (
    <NativeSelect className="w-full" value={value} onChange={(e) => onPick(Number(e.target.value))}>
      {optional && <NativeSelectOption value={-1}>None</NativeSelectOption>}
      {sheet.header.map((h, i) => (
        <NativeSelectOption key={i} value={i}>
          {h + example(i)}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

// ---------- step 3 ----------

type Row = ParsedRow & { hash: string }
type Edit = { include?: boolean; type?: TransactionType; categoryId?: string }

type ReviewProps = {
  sheet: Sheet
  mapping: Mapping
  source: Source
  categories: Category[]
  rules: CategoryRule[]
  onDone: (done: Done) => void
}

const PAGE = 100

function Review({ sheet, mapping, source, categories, rules, onDone }: ReviewProps) {
  const { rows, skipped } = useMemo(() => buildRows(sheet, mapping), [sheet, mapping])
  const [hashed, setHashed] = useState<Row[] | null>(null)
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [checkError, setCheckError] = useState('')
  const [edits, setEdits] = useState<Record<number, Edit>>({})
  const [shown, setShown] = useState(PAGE)
  const [busy, setBusy] = useState(false)
  const [importError, setImportError] = useState('')

  // fingerprint each row and look up which ones were imported before
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const withHashes = await withImportHashes(rows)
      const found = new Set<string>()
      for (let i = 0; i < withHashes.length; i += 80) {
        const chunk = withHashes.slice(i, i + 80).map((r) => r.hash)
        const { data, error } = await supabase.from('transactions').select('import_hash').in('import_hash', chunk)
        if (error) {
          if (!ignore) setCheckError(`Couldn’t check for duplicates: ${error.message}`)
          break
        }
        for (const d of data ?? []) found.add(d.import_hash as string)
      }
      if (!ignore) {
        setHashed(withHashes)
        setExisting(found)
      }
    })()
    return () => {
      ignore = true
    }
  }, [rows])

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // the row as it will be imported, after the user's changes
  function effective(row: Row) {
    const edit = edits[row.line] ?? {}
    const duplicate = existing.has(row.hash)
    const type = edit.type ?? row.type
    const rule = findRule(row.description, rules)
    const auto = rule && categoryById.get(rule.category_id)?.type === type ? rule.category_id : ''
    return {
      duplicate,
      type,
      categoryId: edit.categoryId ?? auto,
      auto: edit.categoryId === undefined && auto !== '',
      include: !duplicate && (edit.include ?? true),
    }
  }

  const edit = (line: number, patch: Edit) => setEdits((all) => ({ ...all, [line]: { ...all[line], ...patch } }))

  if (!hashed) {
    return (
      <SectionCard title="3. Review and import" icon={ListChecks}>
        <p className="text-sm text-muted-foreground">Reading {rows.length} transactions and checking for duplicates…</p>
      </SectionCard>
    )
  }

  const views = hashed.map((row) => ({ row, ...effective(row) }))
  const selected = views.filter((v) => v.include)
  const duplicates = views.filter((v) => v.duplicate).length
  const autoCategorized = selected.filter((v) => v.categoryId).length
  const allOn = selected.length === views.length - duplicates

  async function runImport() {
    setBusy(true)
    setImportError('')
    let imported = 0
    const payload = selected.map((v) => ({
      date: v.row.date,
      description: v.row.description,
      amount: v.row.amount,
      type: v.type,
      category_id: v.categoryId || null,
      source,
      import_hash: v.row.hash,
    }))
    for (let i = 0; i < payload.length; i += 500) {
      // the unique (user_id, import_hash) constraint skips anything already imported
      const { data, error } = await supabase
        .from('transactions')
        .upsert(payload.slice(i, i + 500), { onConflict: 'user_id,import_hash', ignoreDuplicates: true })
        .select('id')
      if (error) {
        setBusy(false)
        return setImportError(
          imported > 0
            ? `Imported ${imported}, then stopped: ${error.message}. Importing the same file again will skip the ones already saved.`
            : error.message
        )
      }
      imported += data?.length ?? 0
    }
    setBusy(false)
    onDone({ imported, duplicates: duplicates + (payload.length - imported) })
  }

  const importButton = (className?: string) => (
    <Button onClick={runImport} disabled={busy || selected.length === 0} className={className}>
      <Upload />
      {busy ? 'Importing…' : `Import ${selected.length} transaction${selected.length === 1 ? '' : 's'}`}
    </Button>
  )

  return (
    <Card className="gap-0 py-0">
      <div className="space-y-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <ListChecks className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold">3. Review and import</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-primary">{selected.length} to import</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{autoCategorized} auto-categorized</span>
          {duplicates > 0 && (
            <span className="rounded-full bg-brand-orange/20 px-2.5 py-1 text-brand-orange-ink">{duplicates} already imported</span>
          )}
          {skipped > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {skipped} line{skipped === 1 ? '' : 's'} skipped (no date or amount)
            </span>
          )}
        </div>
        {checkError && <ErrorAlert message={checkError} />}
        <div className="flex flex-wrap items-center gap-2">
          {importButton()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setEdits((all) => {
                const next = { ...all }
                for (const v of views) if (!v.duplicate) next[v.row.line] = { ...next[v.row.line], include: !allOn }
                return next
              })
            }
          >
            {allOn ? 'Untick all' : 'Tick all'}
          </Button>
        </div>
        {importError && <FormMessage>{importError}</FormMessage>}
      </div>

      {views.length === 0 ? (
        <EmptyState title="No transactions found">
          Check the date and amount columns above. Rows without both are skipped.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border/70">
          {views.slice(0, shown).map((v) => {
            const category = v.categoryId ? categoryById.get(v.categoryId) : undefined
            return (
              <li key={v.row.line} className={cn('flex items-start gap-3 px-5 py-3', v.duplicate && 'bg-muted/40 opacity-60')}>
                <Checkbox
                  className="mt-1"
                  checked={v.include}
                  disabled={v.duplicate}
                  onCheckedChange={(on) => edit(v.row.line, { include: on === true })}
                  aria-label={`Import ${v.row.description}`}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-bold break-words">{v.row.description}</p>
                    <p className={cn('text-sm font-extrabold whitespace-nowrap', v.type === 'income' ? 'text-primary' : 'text-foreground')}>
                      {v.type === 'income' ? '+' : '−'}
                      {formatRM(v.row.amount)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{format(parseISO(v.row.date), 'd MMM yyyy')}</span>
                    {v.duplicate ? (
                      <Badge variant="secondary">Already imported</Badge>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => edit(v.row.line, { type: v.type === 'income' ? 'expense' : 'income', categoryId: undefined })}
                          title="Tap to switch between expense and income"
                          className={cn(
                            'rounded-full px-2 py-0.5 font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            v.type === 'income' ? 'bg-secondary text-primary' : 'bg-brand-orange/20 text-brand-orange-ink'
                          )}
                        >
                          {v.type === 'income' ? 'Income' : 'Expense'} ⇄
                        </button>
                        <NativeSelect
                          size="sm"
                          className="max-w-44"
                          value={v.categoryId}
                          onChange={(e) => edit(v.row.line, { categoryId: e.target.value })}
                          aria-label={`Category for ${v.row.description}`}
                        >
                          <NativeSelectOption value="">Uncategorized</NativeSelectOption>
                          {categories
                            .filter((c) => c.type === v.type)
                            .map((c) => (
                              <NativeSelectOption key={c.id} value={c.id}>
                                {c.name}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        {v.auto && category && <span className="text-primary">✨ auto</span>}
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {views.length > shown && (
        <div className="border-t px-5 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({views.length - shown} left)
          </Button>
        </div>
      )}
      {views.length > 8 && (
        <div className="border-t px-5 py-4">
          {importButton('w-full sm:w-auto')}
        </div>
      )}
    </Card>
  )
}
