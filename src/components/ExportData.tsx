import { useState } from 'react'
import { Download, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import SectionCard from './SectionCard'
import { Button } from '@/components/ui/button'
import { useCategories } from '../hooks/useCategories'
import type { SaveResult } from '../lib/exportCsv'
import { format } from 'date-fns'
import { friendlyError } from '../lib/errors'

type Job = 'transactions' | 'budgets' | 'goals' | 'recurring' | 'categories'

// Account page: download everything as CSV files, for a backup or a spreadsheet
export default function ExportData() {
  const { categories } = useCategories()
  const [busy, setBusy] = useState<Job | null>(null)

  async function run(job: Job, label: string, fn: () => Promise<SaveResult>) {
    setBusy(job)
    try {
      const result = await fn()
      if (result.saved) toast.success(`${label} exported`, { description: `${result.filename} · ${result.rows} row${result.rows === 1 ? '' : 's'}` })
    } catch (e) {
      const message = friendlyError((e as Error).message)
      toast.error(`Couldn’t export ${label.toLowerCase()}`, {
        description: /recurring_transactions/.test(message) ? 'Recurring isn’t set up in your database yet.' : message,
      })
    } finally {
      setBusy(null)
    }
  }

  // the CSV code (and papaparse) only downloads when someone exports
  const csv = () => import('../lib/exportCsv')
  const others: { job: Job; label: string; fn: () => Promise<SaveResult> }[] = [
    { job: 'budgets', label: 'Budgets', fn: async () => (await csv()).exportBudgets(categories) },
    { job: 'goals', label: 'Savings goals', fn: async () => (await csv()).exportGoals() },
    { job: 'recurring', label: 'Recurring', fn: async () => (await csv()).exportRecurring(categories) },
    { job: 'categories', label: 'Categories & rules', fn: async () => (await csv()).exportCategories(categories) },
  ]

  return (
    <SectionCard
      title="Download your data"
      description="CSV files you can open in Excel or Google Sheets, or keep as a backup."
      icon={FileDown}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">All transactions</p>
            <p className="text-xs text-muted-foreground">Every month, newest first. Monetra’s importer can read this file back.</p>
          </div>
          <Button
            disabled={busy !== null}
            onClick={() =>
              run('transactions', 'Transactions', async () => {
                const { exportTransactions, transactionsFilename } = await csv()
                return exportTransactions({}, categories, transactionsFilename(`all-${format(new Date(), 'yyyy-MM-dd')}`))
              })
            }
          >
            <Download />
            {busy === 'transactions' ? 'Preparing…' : 'Download'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {others.map((o) => (
            <Button key={o.job} variant="outline" size="sm" disabled={busy !== null} onClick={() => run(o.job, o.label, o.fn)}>
              <Download />
              {busy === o.job ? 'Preparing…' : o.label}
            </Button>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}
