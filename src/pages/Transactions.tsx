import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { endOfMonth, format, isSameMonth, parseISO, startOfMonth } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, Download, Plus, Search, SearchX, Upload, Wallet, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '../components/EmptyState'
import { ErrorAlert } from '../components/Feedback'
import MonthPicker from '../components/MonthPicker'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import SegmentedControl from '../components/SegmentedControl'
import TransactionForm from '../components/TransactionForm'
import TransactionList from '../components/TransactionList'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@/components/ui/native-select'
import { useCategories } from '../hooks/useCategories'
import { useCategoryRules } from '../hooks/useCategoryRules'
import { SEARCH_LIMIT, useTransactionSearch } from '../hooks/useTransactionSearch'
import { useTransactions } from '../hooks/useTransactions'
import { chartColors } from '../lib/chartTheme'
import { exportTransactions, transactionsFilename } from '../lib/exportCsv'
import { formatRM } from '../lib/format'
import type { TransactionInput, TransactionType } from '../lib/types'

type Scope = 'month' | 'all'

export default function Transactions() {
  // Filters live in the address (?q=grab&category=…&type=…&scope=all&month=2026-11),
  // so the dashboard can link straight to "Shopping in November" and Back works
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const type = (params.get('type') ?? '') as '' | TransactionType
  // typing or filtering searches every month unless a month was chosen (or linked) explicitly
  const scopeParam = params.get('scope')
  const scope: Scope =
    scopeParam === 'all' || scopeParam === 'month' ? scopeParam : q.trim() || category || type ? 'all' : 'month'

  const [month, setMonthState] = useState(() => {
    const m = params.get('month')
    const d = m ? parseISO(`${m}-01`) : new Date()
    return startOfMonth(isNaN(d.getTime()) ? new Date() : d)
  })

  // Quick successive changes (clear the search, then pick a category) must build on each other,
  // even before React re-renders, so keep the newest filters in a ref
  const latest = useRef(params)
  useEffect(() => {
    latest.current = params
  }, [params])
  function setFilter(patch: Record<string, string>) {
    const next = new URLSearchParams(latest.current)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    latest.current = next
    setParams(next, { replace: true })
  }

  function setMonth(m: Date) {
    setMonthState(m)
    if (params.has('month')) setFilter({ month: format(m, 'yyyy-MM') })
  }

  const searching = Boolean(q.trim() || category || type || scope === 'all')

  const { categories } = useCategories()
  const { rules } = useCategoryRules()
  const monthView = useTransactions(month)
  const search = useTransactionSearch(
    {
      q,
      category,
      type,
      from: scope === 'month' ? format(month, 'yyyy-MM-dd') : undefined,
      to: scope === 'month' ? format(endOfMonth(month), 'yyyy-MM-dd') : undefined,
    },
    searching
  )
  const view = searching ? search : monthView
  const { transactions, loading, error } = view

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const partial = searching && search.count > transactions.length

  async function handleAdd(input: TransactionInput) {
    const message = await monthView.add(input)
    // jump to the month of the new transaction so it is visible
    const added = parseISO(input.date)
    if (!message && !isSameMonth(added, month)) setMonth(startOfMonth(added))
    return message
  }

  // The phone's "+" button links to #add: bring the form into view and focus the amount
  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#add') return
    const form = document.getElementById('add')
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    form?.querySelector<HTMLInputElement>('input[inputmode="decimal"]')?.focus({ preventScroll: true })
  }, [location.key, location.hash])

  const monthName = format(month, 'MMMM yyyy')

  const [exporting, setExporting] = useState(false)
  async function exportView() {
    setExporting(true)
    const monthRange = { from: format(month, 'yyyy-MM-dd'), to: format(endOfMonth(month), 'yyyy-MM-dd') }
    try {
      const result = await exportTransactions(
        searching ? { q, category, type, ...(scope === 'month' ? monthRange : {}) } : monthRange,
        categories,
        transactionsFilename(searching ? `search-${format(new Date(), 'yyyy-MM-dd')}` : format(month, 'yyyy-MM'))
      )
      if (result.saved) toast.success('Exported', { description: `${result.filename} · ${result.rows} transaction${result.rows === 1 ? '' : 's'}` })
    } catch (e) {
      toast.error('Couldn’t export', { description: (e as Error).message })
    } finally {
      setExporting(false)
    }
  }
  const categoryName =
    category === 'none' ? 'Uncategorized' : categories.find((c) => c.id === category)?.name ?? (category ? 'that category' : '')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Everything you earned and spent"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/import">
                <Upload /> Import CSV
              </Link>
            </Button>
            <MonthPicker month={month} onChange={setMonth} />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Income" value={formatRM(income)} icon={ArrowDownLeft} color={chartColors.income} />
        <Stat label="Expenses" value={formatRM(expenses)} icon={ArrowUpRight} color={chartColors.expenses} />
        <Stat label="Balance" value={formatRM(income - expenses)} icon={Wallet} />
      </div>
      {searching && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Totals for the {partial ? `first ${transactions.length} of ${search.count}` : search.count} matching transaction
          {search.count === 1 ? '' : 's'}.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div id="add" className="scroll-mt-24 lg:sticky lg:top-24">
          <SectionCard title="Add transaction" description="Categories are picked automatically" icon={Plus}>
            <TransactionForm categories={categories} rules={rules} onSubmit={handleAdd} />
          </SectionCard>
        </div>

        <Card className="gap-0 py-0">
          {/* ---------- search and filters ---------- */}
          <div className="space-y-3 border-b px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">{searching ? 'Results' : 'History'}</h2>
                <p className="text-sm text-muted-foreground">
                  {searching
                    ? loading
                      ? 'Searching…'
                      : `${search.count} found${scope === 'month' ? ` in ${monthName}` : ' in all months'}`
                    : monthName}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {/* saves exactly what's listed: this month, or every search match (not just the first 300 shown) */}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={exporting || transactions.length === 0}
                  onClick={exportView}
                  title="Download what's listed as a CSV file"
                >
                  <Download /> {exporting ? 'Preparing…' : 'Export'}
                </Button>
                {searching ? (
                  <Button variant="ghost" size="sm" onClick={() => setFilter({ q: '', category: '', type: '', scope: '', month: '' })}>
                    <X /> Clear
                  </Button>
                ) : (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-primary">
                    {transactions.length} item{transactions.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={q}
                onChange={(e) => setFilter({ q: e.target.value })}
                placeholder="Search descriptions, e.g. Grab"
                aria-label="Search transactions"
                className="pl-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NativeSelect
                size="sm"
                className="w-full"
                value={category}
                onChange={(e) => setFilter({ category: e.target.value })}
                aria-label="Filter by category"
              >
                <NativeSelectOption value="">All categories</NativeSelectOption>
                <NativeSelectOption value="none">Uncategorized</NativeSelectOption>
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
              <NativeSelect
                size="sm"
                className="w-full"
                value={type}
                onChange={(e) => setFilter({ type: e.target.value })}
                aria-label="Filter by type"
              >
                <NativeSelectOption value="">Income and expenses</NativeSelectOption>
                <NativeSelectOption value="expense">Expenses only</NativeSelectOption>
                <NativeSelectOption value="income">Income only</NativeSelectOption>
              </NativeSelect>
            </div>

            <SegmentedControl
              label="Which months to show"
              className="text-xs"
              value={scope}
              onChange={(s: Scope) => setFilter({ scope: s, month: s === 'month' ? format(month, 'yyyy-MM') : '' })}
              options={[
                { value: 'month', label: monthName },
                { value: 'all', label: 'All months' },
              ]}
            />
          </div>

          {error && <ErrorAlert message={error} className="m-5 w-auto" />}
          {!error && loading && transactions.length === 0 && <p className="p-5 text-sm text-muted-foreground">Loading…</p>}
          {!error && !loading && transactions.length === 0 &&
            (searching ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-bold">No matching transactions</p>
                <p className="text-sm text-muted-foreground">
                  {[q.trim() && `“${q.trim()}”`, categoryName, type && (type === 'income' ? 'income' : 'expenses')]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  {scope === 'month' ? `in ${monthName}` : 'in any month'}. Try fewer filters
                  {scope === 'month' ? ' or All months' : ''}.
                </p>
              </div>
            ) : (
              <EmptyState title="No transactions yet">Nothing recorded in {monthName}. Use the form to add one.</EmptyState>
            ))}

          <TransactionList
            transactions={transactions}
            categories={categories}
            rules={rules}
            onUpdate={view.update}
            onRemove={view.remove}
            highlight={searching ? q : undefined}
          />

          {partial && (
            <p className="border-t px-5 py-3 text-center text-xs text-muted-foreground">
              Showing the newest {SEARCH_LIMIT} of {search.count}. Add a filter to narrow it down.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

// Compact tile so three fit side by side on a phone; the icon carries the colour, the value stays in text ink
function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color?: string }) {
  return (
    <Card size="sm" className="gap-2 px-3 sm:px-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground sm:text-sm">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary sm:size-8"
          style={color ? { backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, color } : undefined}
        >
          <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
        </span>
        {label}
      </p>
      <p className="text-sm font-extrabold tracking-tight sm:text-xl">{value}</p>
    </Card>
  )
}
