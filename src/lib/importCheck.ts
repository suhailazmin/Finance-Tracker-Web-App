import { addRM } from './money'
import type { TransactionType } from './types'

// Checks for the import review, and grouping past imports into a history. No network here, so
// it can be tested.

// A transaction already in Monetra, as the duplicate check needs it
export type Existing = { date: string; amount: number; type: TransactionType; description: string; import_hash: string | null }

export type DuplicateCheck =
  | { kind: 'exact' } // this exact line was imported before
  | { kind: 'possible'; match: Existing } // same date, amount and direction already recorded some other way

type Checkable = { line: number; hash: string; date: string; amount: number; type: TransactionType }

// For each row: imported before, maybe already added another way (typed in, another bank's file), or new.
// Each existing transaction can explain only one row, so two identical purchases on one day still
// leave the second one as new.
export function checkDuplicates(rows: Checkable[], existing: Existing[]): Map<number, DuplicateCheck> {
  const result = new Map<number, DuplicateCheck>()
  const hashes = new Set(existing.map((e) => e.import_hash).filter(Boolean))
  const key = (date: string, amount: number, type: string) => `${date}|${amount.toFixed(2)}|${type}`
  const rowHashes = new Set(rows.map((r) => r.hash))
  const unclaimed = new Map<string, Existing[]>()
  for (const e of existing) {
    if (e.import_hash && rowHashes.has(e.import_hash)) continue // that's an exact duplicate, not a candidate
    const k = key(e.date, e.amount, e.type)
    unclaimed.set(k, [...(unclaimed.get(k) ?? []), e])
  }
  for (const row of rows) {
    if (hashes.has(row.hash)) {
      result.set(row.line, { kind: 'exact' })
      continue
    }
    const candidates = unclaimed.get(key(row.date, row.amount, row.type))
    const match = candidates?.shift()
    if (match) result.set(row.line, { kind: 'possible', match })
  }
  return result
}

// ---------- import history ----------

export const IMPORT_SOURCES = ['maybank', 'cimb', 'tng', 'generic'] as const

export type ImportedRow = { source: string; created_at: string; date: string; amount: number; type: TransactionType }

export type ImportBatch = {
  source: string
  importedAt: string // the first row's created_at
  firstCreated: string // created_at range, for removing exactly this import
  lastCreated: string
  count: number
  from: string // statement dates covered
  to: string
  income: number
  expenses: number
}

// One import saves its rows within moments of each other, from one source. Rows from the same
// source more than this far apart belong to different imports.
const SAME_IMPORT_MS = 2 * 60 * 1000

export function groupImports(rows: ImportedRow[]): ImportBatch[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const batches: ImportBatch[] = []
  let current: ImportBatch | null = null
  let lastTime = 0
  for (const r of sorted) {
    const t = Date.parse(r.created_at)
    if (!current || current.source !== r.source || t - lastTime > SAME_IMPORT_MS) {
      current = { source: r.source, importedAt: r.created_at, firstCreated: r.created_at, lastCreated: r.created_at, count: 0, from: r.date, to: r.date, income: 0, expenses: 0 }
      batches.push(current)
    }
    lastTime = t
    current.lastCreated = r.created_at
    current.count++
    if (r.date < current.from) current.from = r.date
    if (r.date > current.to) current.to = r.date
    if (r.type === 'income') current.income = addRM(current.income, r.amount)
    else current.expenses = addRM(current.expenses, r.amount)
  }
  return batches.reverse() // newest first
}
