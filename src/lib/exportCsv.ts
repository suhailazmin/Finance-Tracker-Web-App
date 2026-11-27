import Papa from 'papaparse'
import { format, parseISO } from 'date-fns'
import { supabase } from './supabase'
import type { Category, TransactionType } from './types'

// CSV exports for backups and spreadsheets. Fetches every row (in pages), not just what's on screen.

const PAGE = 1000
const today = () => format(new Date(), 'yyyy-MM-dd')

type Row = Record<string, string | number>

// Reads a whole table in pages of 1,000 (Supabase caps a single response)
async function fetchAll<T>(
  table: string,
  columns: string,
  apply: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => typeof q = (q) => q
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await apply(supabase.from(table).select(columns)).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    all.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE) return all
  }
}

export type SaveResult = { saved: boolean; filename: string; rows: number }

// Phones get the share sheet (Save to Files, AirDrop, email…); computers get a normal download
async function saveCsv(filename: string, rows: Row[]): Promise<SaveResult> {
  // escapeFormulae stops a description like "=HYPERLINK(…)" running as a spreadsheet formula;
  // the BOM makes Excel read the file as UTF-8 (for ’ and ·)
  const csv = '﻿' + Papa.unparse(rows, { escapeFormulae: true })
  const file = new File([csv], filename, { type: 'text/csv' })

  const phone = window.matchMedia('(pointer: coarse)').matches
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return { saved: true, filename, rows: rows.length }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return { saved: false, filename, rows: rows.length }
      // sharing not allowed here: fall through to a download
    }
  }
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { saved: true, filename, rows: rows.length }
}

const typeLabel = (t: TransactionType) => (t === 'income' ? 'Income' : 'Expense')
const money = (n: number | string) => Math.round(Number(n) * 100) / 100

// ---------- transactions ----------

export type TransactionFilter = {
  q?: string
  category?: string // '' any, 'none' uncategorized, or an id
  type?: '' | TransactionType
  from?: string
  to?: string
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

type TxRow = { date: string; description: string; amount: number; type: TransactionType; category_id: string | null; source: string | null }

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  recurring: 'Recurring',
  maybank: 'Import: Maybank',
  cimb: 'Import: CIMB',
  tng: 'Import: Touch ’n Go',
  generic: 'Import: CSV',
}

export async function exportTransactions(filter: TransactionFilter, categories: Category[], filename: string) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = await fetchAll<TxRow>('transactions', 'date, description, amount, type, category_id, source', (q) => {
    if (filter.q?.trim()) q = q.ilike('description', `%${likeEscape(filter.q.trim())}%`)
    if (filter.category === 'none') q = q.is('category_id', null)
    else if (filter.category) q = q.eq('category_id', filter.category)
    if (filter.type) q = q.eq('type', filter.type)
    if (filter.from) q = q.gte('date', filter.from)
    if (filter.to) q = q.lte('date', filter.to)
    return q.order('date', { ascending: false }).order('created_at', { ascending: false })
  })
  return saveCsv(
    filename,
    rows.map((t) => ({
      Date: t.date,
      Description: t.description,
      Category: (t.category_id && names.get(t.category_id)) || 'Uncategorized',
      Type: typeLabel(t.type),
      'Amount (RM)': money(t.amount),
      // negative for spending, handy for SUM() in a spreadsheet; Monetra's importer reads this column too
      'Signed amount (RM)': t.type === 'income' ? money(t.amount) : -money(t.amount),
      Source: SOURCE_LABELS[t.source ?? 'manual'] ?? t.source ?? 'Manual',
    }))
  )
}

export const transactionsFilename = (label: string) => `monetra-transactions-${label}.csv`

// ---------- everything else, for the Account page ----------

export async function exportBudgets(categories: Category[]) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = await fetchAll<{ month: string; category_id: string; limit_amount: number }>(
    'budgets',
    'month, category_id, limit_amount',
    (q) => q.order('month', { ascending: false })
  )
  return saveCsv(
    `monetra-budgets-${today()}.csv`,
    rows.map((b) => ({
      Month: format(parseISO(b.month), 'yyyy-MM'),
      Category: names.get(b.category_id) ?? 'Deleted category',
      'Monthly limit (RM)': money(b.limit_amount),
    }))
  )
}

export async function exportGoals() {
  const rows = await fetchAll<{ name: string; target_amount: number; current_amount: number; target_date: string | null }>(
    'savings_goals',
    'name, target_amount, current_amount, target_date',
    (q) => q.order('name')
  )
  return saveCsv(
    `monetra-savings-goals-${today()}.csv`,
    rows.map((g) => ({
      Goal: g.name,
      'Target (RM)': money(g.target_amount),
      'Saved (RM)': money(g.current_amount),
      'Target date': g.target_date ?? '',
    }))
  )
}

export async function exportRecurring(categories: Category[]) {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = await fetchAll<{
    description: string
    amount: number
    type: TransactionType
    category_id: string | null
    day_of_month: number
    start_month: string
    auto_add: boolean
    active: boolean
  }>('recurring_transactions', 'description, amount, type, category_id, day_of_month, start_month, auto_add, active', (q) =>
    q.order('day_of_month')
  )
  return saveCsv(
    `monetra-recurring-${today()}.csv`,
    rows.map((r) => ({
      Description: r.description,
      Type: typeLabel(r.type),
      Category: (r.category_id && names.get(r.category_id)) || 'Uncategorized',
      'Amount (RM)': money(r.amount),
      'Day of month': r.day_of_month,
      'When due': r.auto_add ? 'Add automatically' : 'Ask first',
      Status: r.active ? 'Active' : 'Paused',
      'Started (month)': format(parseISO(r.start_month), 'yyyy-MM'),
    }))
  )
}

export async function exportCategories(categories: Category[]) {
  const rules = await fetchAll<{ keyword: string; category_id: string; priority: number }>(
    'category_rules',
    'keyword, category_id, priority',
    (q) => q.order('keyword')
  )
  return saveCsv(
    `monetra-categories-${today()}.csv`,
    categories.map((c) => ({
      Category: c.name,
      Type: typeLabel(c.type),
      Colour: c.color ?? '',
      'Auto-categorize keywords': rules
        .filter((r) => r.category_id === c.id)
        .map((r) => (r.priority > 0 ? `${r.keyword} (first)` : r.keyword))
        .join('; '),
    }))
  )
}
