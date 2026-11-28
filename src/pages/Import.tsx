import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, CircleCheck, Columns3, FileSpreadsheet, ListChecks, TriangleAlert, Upload, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorAlert, FormMessage } from '../components/Feedback'
import EmptyState from '../components/EmptyState'
import Field from '../components/Field'
import ImportHistory from '../components/ImportHistory'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { findRule } from '../lib/categorize'
import { formatRM } from '../lib/format'
import { checkDuplicates, type DuplicateCheck, type Existing } from '../lib/importCheck'
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
  type SkippedRow,
  type Source,
} from '../lib/importCsv'
import { sumRM } from '../lib/money'
import { supabase } from '../lib/supabase'
import type { Category, CategoryRule, TransactionType } from '../lib/types'
import { friendlyError } from '../lib/errors'

const MAX_FILE_BYTES = 5 * 1024 * 1024

// Everything that happened to the file, so the numbers can be checked against each other
type Done = {
  fileLines: number
  found: number // transactions read from the file, including lines the user fixed
  fixed: number
  summaries: number // balance/total lines, ignored
  unreadable: number // lines still not readable
  imported: number
  income: number
  incomeCount: number
  expenses: number
  expensesCount: number
  alreadyImported: number
  possibleLeftOut: number
  leftOutByYou: number
  from: string
  to: string
}

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
        <>
          <Reconciliation done={done} onAnother={reset} />
          <ImportHistory />
        </>
      ) : (
        <>
          <SectionCard title="1. Choose your statement" icon={Upload}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
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

          {file && mapping ? (
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
                // start fresh (ticks, categories, fixes) whenever the columns change
                key={JSON.stringify(mapping)}
                sheet={file.sheet}
                mapping={mapping}
                source={source}
                categories={categories}
                rules={rules}
                onDone={setDone}
              />
            </>
          ) : (
            <ImportHistory />
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
type View = 'all' | 'import' | 'out'

type ReviewProps = {
  sheet: Sheet
  mapping: Mapping
  source: Source
  categories: Category[]
  rules: CategoryRule[]
  onDone: (done: Done) => void
}

const PAGE = 100
const shortDate = (d: string) => format(parseISO(d), 'd MMM yyyy')

function Review({ sheet, mapping, source, categories, rules, onDone }: ReviewProps) {
  const built = useMemo(() => buildRows(sheet, mapping), [sheet, mapping])
  // lines the user fixed by hand, added back in
  const [fixes, setFixes] = useState<ParsedRow[]>([])
  const rows = useMemo(() => [...built.rows, ...fixes].sort((a, b) => a.line - b.line), [built.rows, fixes])
  const fixedLines = new Set(fixes.map((f) => f.line))
  const skipped = built.skipped.filter((s) => !fixedLines.has(s.line))
  const unreadable = skipped.filter((s) => !s.summary)
  const summaries = skipped.filter((s) => s.summary)

  const [checked, setChecked] = useState<{ rows: Row[]; checks: Map<number, DuplicateCheck> } | null>(null)
  const [checkError, setCheckError] = useState('')
  const [edits, setEdits] = useState<Record<number, Edit>>({})
  const [shown, setShown] = useState(PAGE)
  const [busy, setBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [view, setView] = useState<View>('all')
  const [filter, setFilter] = useState('')

  // fingerprint each row, then compare with what's already in Monetra for those dates:
  // the same line imported before, or the same date and amount added some other way
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const withHashes = await withImportHashes(rows)
      const dates = withHashes.map((r) => r.date).sort()
      const existing: Existing[] = []
      if (dates.length) {
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from('transactions')
            .select('date, amount, type, description, import_hash')
            .gte('date', dates[0])
            .lte('date', dates[dates.length - 1])
            .range(from, from + 999)
          if (error) {
            if (!ignore) setCheckError(`Couldn’t check for duplicates. ${friendlyError(error)}`)
            break
          }
          existing.push(...((data ?? []) as Existing[]).map((e) => ({ ...e, amount: Number(e.amount) })))
          if (!data || data.length < 1000) break
        }
      }
      if (!ignore) setChecked({ rows: withHashes, checks: checkDuplicates(withHashes, existing) })
    })()
    return () => {
      ignore = true
    }
  }, [rows])

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // the row as it will be imported, after the user's changes
  function effective(row: Row, check: DuplicateCheck | undefined) {
    const edit = edits[row.line] ?? {}
    const duplicate = check?.kind === 'exact'
    const possible = check?.kind === 'possible' ? check.match : null
    const type = edit.type ?? row.type
    const rule = findRule(row.description, rules)
    const auto = rule && categoryById.get(rule.category_id)?.type === type ? rule.category_id : ''
    return {
      duplicate,
      possible,
      type,
      categoryId: edit.categoryId ?? auto,
      auto: edit.categoryId === undefined && auto !== '',
      // possible duplicates stay out unless ticked
      include: !duplicate && (edit.include ?? !possible),
    }
  }

  const edit = (line: number, patch: Edit) => setEdits((all) => ({ ...all, [line]: { ...all[line], ...patch } }))

  if (!checked) {
    return (
      <SectionCard title="3. Review and import" icon={ListChecks}>
        <p className="text-sm text-muted-foreground">Reading {rows.length} transactions and checking for duplicates…</p>
      </SectionCard>
    )
  }

  const views = checked.rows.map((row) => ({ row, ...effective(row, checked.checks.get(row.line)) }))
  const selected = views.filter((v) => v.include)
  const duplicates = views.filter((v) => v.duplicate).length
  const possibleOut = views.filter((v) => v.possible && !v.include).length
  const leftOutByYou = views.filter((v) => !v.duplicate && !v.possible && !v.include).length
  const income = selected.filter((v) => v.type === 'income')
  const expenses = selected.filter((v) => v.type === 'expense')
  const importable = views.filter((v) => !v.duplicate)
  const allOn = selected.length === importable.length
  const sortedDates = views.map((v) => v.row.date).sort()

  const needle = filter.trim().toLowerCase()
  const listed = views.filter(
    (v) =>
      (view === 'all' || (view === 'import' ? v.include : !v.include)) &&
      (!needle || v.row.description.toLowerCase().includes(needle))
  )

  // bulk: one category for every listed row of that category's type
  function setCategoryForListed(categoryId: string) {
    const category = categoryById.get(categoryId)
    if (!category) return
    const targets = listed.filter((v) => !v.duplicate && v.type === category.type)
    setEdits((all) => {
      const next = { ...all }
      for (const v of targets) next[v.row.line] = { ...next[v.row.line], categoryId }
      return next
    })
    const others = listed.filter((v) => !v.duplicate).length - targets.length
    toast.success(`${category.name} set for ${targets.length} row${targets.length === 1 ? '' : 's'}`, {
      description: others > 0 ? `${others} ${category.type === 'expense' ? 'income' : 'expense'} row${others === 1 ? '' : 's'} kept their category.` : undefined,
    })
  }

  async function runImport() {
    setBusy(true)
    setImportError('')
    const inserted: { amount: number; type: TransactionType }[] = []
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
        .select('amount, type')
      if (error) {
        setBusy(false)
        return setImportError(
          inserted.length > 0
            ? `Imported ${inserted.length}, then stopped. ${friendlyError(error)} Importing the same file again will skip the ones already saved.`
            : friendlyError(error)
        )
      }
      inserted.push(...((data ?? []) as { amount: number; type: TransactionType }[]).map((r) => ({ ...r, amount: Number(r.amount) })))
    }
    setBusy(false)
    const importedIn = inserted.filter((r) => r.type === 'income')
    const importedOut = inserted.filter((r) => r.type === 'expense')
    onDone({
      fileLines: sheet.rows.length,
      found: views.length,
      fixed: fixes.length,
      summaries: summaries.length,
      unreadable: unreadable.length,
      imported: inserted.length,
      income: sumRM(importedIn.map((r) => r.amount)),
      incomeCount: importedIn.length,
      expenses: sumRM(importedOut.map((r) => r.amount)),
      expensesCount: importedOut.length,
      // anything the database turned away as already there counts with the duplicates
      alreadyImported: duplicates + (payload.length - inserted.length),
      possibleLeftOut: possibleOut,
      leftOutByYou,
      from: selected.map((v) => v.row.date).sort()[0] ?? sortedDates[0] ?? '',
      to: selected.map((v) => v.row.date).sort().at(-1) ?? sortedDates.at(-1) ?? '',
    })
  }

  const importButton = (className?: string) => (
    <Button onClick={runImport} disabled={busy || selected.length === 0} className={className}>
      <Upload />
      {busy ? 'Importing…' : `Import ${selected.length} transaction${selected.length === 1 ? '' : 's'}`}
    </Button>
  )

  return (
    <>
      <Card className="gap-0 py-0">
        <div className="space-y-4 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <ListChecks className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold">3. Review and import</h2>
              <p className="text-sm text-muted-foreground">
                {sheet.rows.length} lines in the file
                {sortedDates.length > 0 && ` · ${shortDate(sortedDates[0])} to ${shortDate(sortedDates[sortedDates.length - 1])}`}
              </p>
            </div>
          </div>

          {/* import summary: what will happen, before it happens */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat tone="good" value={selected.length} label="Ready to import">
              {income.length > 0 && <span className="text-primary">+{formatRM(sumRM(income.map((v) => v.row.amount)))} in</span>}
              {income.length > 0 && expenses.length > 0 && ' · '}
              {expenses.length > 0 && <span>−{formatRM(sumRM(expenses.map((v) => v.row.amount)))} out</span>}
            </Stat>
            <Stat value={duplicates} label="Already in Monetra">
              Imported before, won’t be added again
            </Stat>
            <Stat tone={possibleOut > 0 ? 'warning' : undefined} value={views.filter((v) => v.possible).length} label="Might be duplicates">
              Same date and amount as one you have. Left out unless you tick them
            </Stat>
            <Stat tone={unreadable.length > 0 ? 'warning' : undefined} value={unreadable.length} label="Couldn’t be read">
              {unreadable.length > 0 ? (
                <a href="#skipped" className="font-semibold text-primary hover:underline">
                  See why and fix
                </a>
              ) : summaries.length > 0 ? (
                `${summaries.length} balance or total line${summaries.length === 1 ? '' : 's'} ignored`
              ) : (
                'Every line was read'
              )}
            </Stat>
          </div>
          {leftOutByYou > 0 && <p className="text-xs text-muted-foreground">{leftOutByYou} more left out because you unticked them.</p>}

          {checkError && <ErrorAlert message={checkError} />}
          <div className="flex flex-wrap items-center gap-2">
            {importButton()}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setEdits((all) => {
                  const next = { ...all }
                  for (const v of importable) next[v.row.line] = { ...next[v.row.line], include: !allOn }
                  return next
                })
              }
            >
              {allOn ? 'Untick all' : 'Tick all'}
            </Button>
          </div>
          {importError && <FormMessage>{importError}</FormMessage>}
        </div>

        {views.length > 0 && (
          <div className="space-y-2 border-b bg-muted/30 px-5 py-3">
            <SegmentedControl
              label="Which rows to show"
              className="text-xs sm:max-w-md"
              value={view}
              onChange={(v: View) => setView(v)}
              options={[
                { value: 'all', label: `All ${views.length}` },
                { value: 'import', label: `To import ${selected.length}` },
                { value: 'out', label: `Left out ${views.length - selected.length}` },
              ]}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter rows, e.g. GRAB"
                aria-label="Filter rows by description"
                className="h-8"
              />
              {/* bulk category: for every row listed below */}
              <NativeSelect
                size="sm"
                className="w-full"
                value=""
                onChange={(e) => setCategoryForListed(e.target.value)}
                aria-label="Set a category for every row listed"
              >
                <NativeSelectOption value="">Set category for these {listed.length} rows…</NativeSelectOption>
                {(['expense', 'income'] as const).map((t) => (
                  <NativeSelectOptGroup key={t} label={t === 'expense' ? 'Expenses' : 'Income'}>
                    {categories
                      .filter((c) => c.type === t)
                      .map((c) => (
                        <NativeSelectOption key={c.id} value={c.id}>
                          {c.name}
                        </NativeSelectOption>
                      ))}
                  </NativeSelectOptGroup>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}

        {views.length === 0 ? (
          <EmptyState title="No transactions found">
            Check the date and amount columns above. The lines below show why each one couldn’t be read.
          </EmptyState>
        ) : listed.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No rows match. Clear the filter or pick All.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {listed.slice(0, shown).map((v) => {
              const category = v.categoryId ? categoryById.get(v.categoryId) : undefined
              return (
                <li
                  key={v.row.line}
                  className={cn('flex items-start gap-3 px-5 py-3', v.duplicate && 'bg-muted/40 opacity-60', v.possible && !v.include && 'bg-brand-orange/5')}
                >
                  <Checkbox
                    className="mt-1"
                    checked={v.include}
                    disabled={v.duplicate}
                    onCheckedChange={(on) => edit(v.row.line, { include: on === true })}
                    aria-label={`Import ${v.row.description}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-bold wrap-break-word">{v.row.description}</p>
                      <p className={cn('text-sm font-extrabold whitespace-nowrap', v.type === 'income' ? 'text-primary' : 'text-foreground')}>
                        {v.type === 'income' ? '+' : '−'}
                        {formatRM(v.row.amount)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{shortDate(v.row.date)}</span>
                      {fixedLines.has(v.row.line) && <Badge variant="outline">Fixed by you</Badge>}
                      {v.duplicate ? (
                        <Badge variant="secondary">Already in Monetra</Badge>
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
                    {v.possible && (
                      <p className="flex items-start gap-1.5 text-xs text-brand-orange-ink">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          Might be a duplicate: you already have “{v.possible.description}” on {shortDate(v.possible.date)} for{' '}
                          {formatRM(v.possible.amount)}. {v.include ? 'It will be imported anyway.' : 'Tick it to import it anyway.'}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {listed.length > shown && (
          <div className="border-t px-5 py-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({listed.length - shown} left)
            </Button>
          </div>
        )}
        {listed.length > 8 && <div className="border-t px-5 py-4">{importButton('w-full sm:w-auto')}</div>}
      </Card>

      {(unreadable.length > 0 || summaries.length > 0) && (
        <Skipped unreadable={unreadable} summaries={summaries} onFix={(row) => setFixes((all) => [...all, row])} />
      )}
    </>
  )
}

function Stat({ value, label, tone, children }: { value: number; label: string; tone?: 'good' | 'warning'; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2.5',
        tone === 'good' ? 'bg-secondary' : tone === 'warning' ? 'bg-brand-orange/15' : 'bg-muted/60'
      )}
    >
      <p className="text-xl font-extrabold">{value}</p>
      <p className="text-xs font-bold">{label}</p>
      {children && <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>}
    </div>
  )
}

// ---------- lines that couldn't be read ----------

function Skipped({ unreadable, summaries, onFix }: { unreadable: SkippedRow[]; summaries: SkippedRow[]; onFix: (row: ParsedRow) => void }) {
  const [fixing, setFixing] = useState<number | null>(null)
  return (
    <SectionCard
      id="skipped"
      title={unreadable.length ? `${unreadable.length} line${unreadable.length === 1 ? '' : 's'} couldn’t be read` : 'Lines that were ignored'}
      description={
        unreadable.length
          ? 'They aren’t in the list above. Fix one to add it, or leave it out.'
          : 'Balance and total lines aren’t transactions, so they’re left out.'
      }
      icon={Wrench}
      tone="orange"
    >
      {unreadable.length > 0 && (
        <ul className="-my-2 divide-y divide-border/70">
          {unreadable.map((s) => (
            <li key={s.line} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    Line {s.line}: {s.reason}
                  </p>
                  <p className="text-xs break-all text-muted-foreground">{s.raw || '(empty line)'}</p>
                </div>
                {fixing !== s.line && (
                  <Button variant="outline" size="sm" onClick={() => setFixing(s.line)}>
                    <Wrench /> Fix
                  </Button>
                )}
              </div>
              {fixing === s.line && (
                <FixForm
                  skipped={s}
                  onCancel={() => setFixing(null)}
                  onSave={(row) => {
                    onFix(row)
                    setFixing(null)
                    toast.success(`Line ${s.line} added to the import`, { description: `${row.description} · ${formatRM(row.amount)}` })
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {summaries.length > 0 && (
        <details className={cn('text-sm', unreadable.length > 0 && 'mt-4')}>
          <summary className="cursor-pointer font-semibold text-primary">
            {summaries.length} balance or total line{summaries.length === 1 ? '' : 's'} ignored
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {summaries.map((s) => (
              <li key={s.line}>
                Line {s.line}: {s.raw}
              </li>
            ))}
          </ul>
        </details>
      )}
    </SectionCard>
  )
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

// Error recovery: type in what the line couldn't tell us, starting from what it could
function FixForm({ skipped, onSave, onCancel }: { skipped: SkippedRow; onSave: (row: ParsedRow) => void; onCancel: () => void }) {
  const [date, setDate] = useState(skipped.date)
  const [description, setDescription] = useState(skipped.description === 'Bank transaction' ? '' : skipped.description)
  const [amount, setAmount] = useState(skipped.amount ? skipped.amount.toFixed(2) : '')
  const [type, setType] = useState<TransactionType>(skipped.type)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = amount.trim().replace(/,/g, '')
    if (!date) return setError('Pick the date.')
    if (!AMOUNT_PATTERN.test(clean) || Number(clean) <= 0) return setError('Enter an amount above RM 0 with at most 2 decimal places.')
    onSave({ line: skipped.line, date, description: description.trim() || 'Bank transaction', amount: Number(clean), type })
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-muted/50 p-3">
      <SegmentedControl
        label="Expense or income"
        className="text-xs sm:max-w-xs"
        value={type}
        onChange={(t: TransactionType) => setType(t)}
        options={[
          { value: 'expense', label: 'Expense', activeClassName: 'text-brand-orange-ink' },
          { value: 'income', label: 'Income', activeClassName: 'text-primary' },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr]">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Amount (RM)">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Petronas" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          Add to import
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </form>
  )
}

// ---------- after importing: every line accounted for ----------

function Reconciliation({ done, onAnother }: { done: Done; onAnother: () => void }) {
  const leftOut = done.alreadyImported + done.possibleLeftOut + done.leftOutByYou
  const balances = done.imported + leftOut === done.found
  return (
    <SectionCard
      title={`Imported ${done.imported} transaction${done.imported === 1 ? '' : 's'}`}
      description={done.from ? `Dated ${shortDate(done.from)} to ${shortDate(done.to)}. They now appear in the months they happened in.` : undefined}
      icon={CircleCheck}
    >
      <dl className="divide-y divide-border/70 rounded-xl bg-muted/40 px-4 text-sm">
        <Line label="Lines in the file" value={done.fileLines} />
        <Line label="Transactions found" value={done.found} note={done.fixed ? `including ${done.fixed} you fixed` : undefined} />
        <Line label="Imported" value={done.imported} strong indent>
          {done.incomeCount > 0 && (
            <span className="text-primary">
              +{formatRM(done.income)} income ({done.incomeCount})
            </span>
          )}
          {done.incomeCount > 0 && done.expensesCount > 0 && <br />}
          {done.expensesCount > 0 && (
            <span>
              −{formatRM(done.expenses)} expenses ({done.expensesCount})
            </span>
          )}
        </Line>
        <Line label="Duplicates skipped (already in Monetra)" value={done.alreadyImported} indent />
        {done.possibleLeftOut > 0 && <Line label="Possible duplicates left out" value={done.possibleLeftOut} indent />}
        {done.leftOutByYou > 0 && <Line label="Left out by you" value={done.leftOutByYou} indent />}
        {done.summaries > 0 && <Line label="Balance or total lines ignored" value={done.summaries} />}
        {done.unreadable > 0 && <Line label="Lines that couldn’t be read (not imported)" value={done.unreadable} />}
      </dl>
      <p className={cn('mt-3 flex items-start gap-2 text-sm', balances ? 'text-primary' : 'text-destructive')}>
        {balances ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        {balances
          ? `All ${done.found} transactions found are accounted for: ${done.imported} imported and ${leftOut} skipped.`
          : 'Some transactions aren’t accounted for. Import the same file again to add anything missing; duplicates are skipped.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {done.from && (
          <Button asChild>
            <Link to={`/transactions?scope=dates&from=${done.from}&to=${done.to}`}>See these dates in Transactions</Link>
          </Button>
        )}
        <Button variant="outline" onClick={onAnother}>
          Import another file
        </Button>
      </div>
    </SectionCard>
  )
}

function Line({ label, value, note, strong, indent, children }: { label: string; value: number; note?: string; strong?: boolean; indent?: boolean; children?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2.5', indent && 'pl-4')}>
      <dt className={cn(strong ? 'font-bold' : 'text-muted-foreground')}>
        {label}
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
        {children && <span className="mt-0.5 block text-xs font-normal">{children}</span>}
      </dt>
      <dd className={cn('font-extrabold tabular-nums', strong && 'text-primary')}>{value}</dd>
    </div>
  )
}
