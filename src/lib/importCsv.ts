import Papa from 'papaparse'
import { format, isValid, parse } from 'date-fns'
import type { TransactionType } from './types'

// Reading bank / e-wallet statement CSVs. Every bank lays its export out differently, so
// nothing here is tied to one bank: we find the header row, guess which column is which,
// and the import page lets the user correct the guesses.

export type Source = 'maybank' | 'cimb' | 'tng' | 'generic'

export const SOURCES: { value: Source; label: string }[] = [
  { value: 'maybank', label: 'Maybank' },
  { value: 'cimb', label: 'CIMB' },
  { value: 'tng', label: 'Touch ’n Go eWallet' },
  { value: 'generic', label: 'Other bank' },
]

export type AmountMode =
  | 'signed' // one amount column; minus sign (or CR/DR) says the direction
  | 'split' // separate money-out and money-in columns
  | 'unsigned' // one amount column, all positive: money out unless a type column says otherwise

export type Mapping = {
  date: number
  description: number
  extraDescription: number // -1 = none; appended to the description (e.g. "Details")
  mode: AmountMode
  amount: number // signed / unsigned modes
  moneyOut: number // split mode
  moneyIn: number // split mode
  direction: number // -1 = none; a column like "DR/CR" or "Transaction Type"
  negativeIsOut: boolean // signed mode: does a minus mean money out? (usual for bank exports)
}

export type Sheet = { header: string[]; rows: string[][] }

export type ParsedRow = {
  line: number // 1-based row number in the file, for messages
  date: string // yyyy-MM-dd
  description: string
  amount: number // always positive
  type: TransactionType
}

export const MAX_ROWS = 3000

const clean = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

// ---------- reading the file ----------

const DATE_HEADER = /\b(date|tarikh)\b/i

export function readCsv(text: string): Sheet | null {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' })
  const data = parsed.data.map((row) => row.map(clean))
  if (data.length === 0) return null

  // Statements often start with account details; the header is the first row with a
  // "date" column and at least two other filled cells
  let headerIndex = data.slice(0, 40).findIndex(
    (row) => row.some((cell) => DATE_HEADER.test(cell) && cell.length < 30) && row.filter(Boolean).length >= 3
  )
  if (headerIndex < 0) {
    // no recognisable header: use the widest early row
    const widths = data.slice(0, 40).map((row) => row.filter(Boolean).length)
    headerIndex = widths.indexOf(Math.max(...widths))
  }

  const header = data[headerIndex].map((h, i) => h || `Column ${i + 1}`)
  const rows = data.slice(headerIndex + 1).filter((row) => row.some(Boolean))
  return { header, rows }
}

// ---------- guessing which column is which ----------

const BALANCE = /balance|baki/i
const DIRECTION = /^(dr\s*\/\s*cr|cr\s*\/\s*dr|debit\s*\/\s*credit|type|transaction type|trans(action)?\.? type|direction|indicator)$/i
const DESCRIPTION = /description|details?|particulars?|keterangan|narration|merchant|remarks?|payee/i
const DESCRIPTION_FALLBACK = /reference|transaction|recipient/i
const MONEY_OUT = /debit|withdraw|money out|paid out|spend|^out$|^dr$|outflow/i
const MONEY_IN = /credit|deposit|money in|paid in|^in$|^cr$|inflow/i
const AMOUNT = /amount|amaun|^rm$|value|total/i

function findColumn(header: string[], test: RegExp, skip: number[] = []) {
  return header.findIndex((h, i) => !skip.includes(i) && test.test(h) && !BALANCE.test(h))
}

export function guessMapping(sheet: Sheet): Mapping {
  const { header } = sheet
  const date = Math.max(0, header.findIndex((h) => DATE_HEADER.test(h) && !/time/i.test(h)))
  const direction = findColumn(header, DIRECTION, [date])
  const used = [date, direction]

  let description = findColumn(header, DESCRIPTION, used)
  if (description < 0) description = findColumn(header, DESCRIPTION_FALLBACK, used)
  if (description < 0) description = header.findIndex((_, i) => !used.includes(i))
  // a second text column worth keeping (reference numbers are noise, so they are not used)
  const extraSkip = [...used, description]
  let extraDescription = findColumn(header, /details?/i, extraSkip)
  if (extraDescription < 0) extraDescription = findColumn(header, /description ?2|remarks?|notes?/i, extraSkip)

  const amountSkip = [...used, description, extraDescription]
  const moneyOut = findColumn(header, MONEY_OUT, amountSkip)
  const moneyIn = findColumn(header, MONEY_IN, [...amountSkip, moneyOut])
  const amount = findColumn(header, AMOUNT, amountSkip)

  const mapping: Mapping = {
    date,
    description,
    extraDescription,
    mode: 'signed',
    amount: amount >= 0 ? amount : Math.max(moneyOut, moneyIn),
    moneyOut,
    moneyIn,
    direction,
    negativeIsOut: true,
  }

  if (moneyOut >= 0 && moneyIn >= 0 && moneyOut !== moneyIn) {
    mapping.mode = 'split'
  } else if (mapping.amount >= 0) {
    // all-positive amounts with no CR/DR markers: an e-wallet or card export where most rows are spending
    const sample = sheet.rows.slice(0, 200).map((r) => parseAmount(r[mapping.amount])).filter((a) => a !== null)
    const hasSign = sample.some((a) => a.negative || a.marker)
    mapping.mode = hasSign ? 'signed' : 'unsigned'
  }
  return mapping
}

// ---------- reading values ----------

const DATE_FORMATS = [
  'dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd', 'yyyy/MM/dd',
  'dd MMM yyyy', 'd MMM yyyy', 'dd-MMM-yyyy', 'd-MMM-yyyy', 'dd MMM yy', 'dd-MMM-yy', 'd MMMM yyyy',
  'dd/MM/yy', 'd/M/yy', 'yyyyMMdd',
]

// Day-first, as Malaysian banks use; time parts are ignored
export function parseDate(raw: string): string | null {
  const text = clean(raw)
    .replace(/T\d{2}:\d{2}.*$/, '') // ISO time
    .replace(/[\s,]+\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i, '') // trailing time
  if (!text) return null
  for (const f of DATE_FORMATS) {
    const d = parse(text, f, new Date(2000, 0, 1))
    if (isValid(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) return format(d, 'yyyy-MM-dd')
  }
  return null
}

export type Amount = { value: number; negative: boolean; marker: 'cr' | 'dr' | null }

// "RM 1,234.50", "-12.00", "12.00-", "(12.00)", "12.00 CR", "DR 5.00" -> value + direction hints
export function parseAmount(raw: string | undefined): Amount | null {
  let text = clean(raw).toUpperCase()
  if (!text) return null
  let marker: Amount['marker'] = null
  const m = text.match(/\b(CR|DR)\b/)
  if (m) {
    marker = m[1] === 'CR' ? 'cr' : 'dr'
    text = text.replace(/\b(CR|DR)\b/, '')
  }
  let negative = false
  if (/^\(.*\)$/.test(text.trim())) negative = true
  text = text.replace(/RM|MYR|[(),\s]/g, '')
  if (text.endsWith('-')) {
    negative = true
    text = text.slice(0, -1)
  }
  if (text.startsWith('-')) {
    negative = true
    text = text.slice(1)
  }
  text = text.replace(/^\+/, '')
  if (!/^\d*\.?\d+$/.test(text)) return null
  const value = Math.round(Number(text) * 100) / 100
  return Number.isFinite(value) ? { value, negative, marker } : null
}

// "Income" / "Expense" also read back Monetra's own export
const INCOME_WORDS = /\b(income|cr|credit|deposit|reload|top ?up|receive[ds]?|received|refund|cash ?in|incoming|salary|dividend|interest|transfer in|money in|cashback)\b/i
const EXPENSE_WORDS = /\b(expenses?|dr|debit|payment|pay|withdraw(al)?|purchase|transfer out|spend|spent|paid|money out|deduct(ed|ion)?|charge)\b/i

export function directionOf(raw: string | undefined): TransactionType | null {
  const text = clean(raw)
  if (!text) return null
  if (INCOME_WORDS.test(text)) return 'income'
  if (EXPENSE_WORDS.test(text)) return 'expense'
  return null
}

// ---------- turning rows into transactions ----------

// A line that couldn't be read as a transaction: why, and whatever could be read, so it can be fixed
export type SkippedRow = {
  line: number
  reason: string
  raw: string // the line as it was in the file, shortened
  summary: boolean // a balance/total line: not a transaction, nothing to fix
  date: string // yyyy-MM-dd if the date could be read, else ''
  description: string
  amount: number | null
  type: TransactionType
}

const SUMMARY_LINE = /\b(opening|closing|beginning|ending|brought forward|carried forward|b\/f|c\/f)\b|\b(balance|baki|total|jumlah|subtotal)\b/i

export function buildRows(sheet: Sheet, mapping: Mapping): { rows: ParsedRow[]; skipped: SkippedRow[] } {
  const rows: ParsedRow[] = []
  const skipped: SkippedRow[] = []

  sheet.rows.forEach((cells, i) => {
    const line = i + 2 // header is line 1 of the data block
    const date = parseDate(cells[mapping.date])
    let description = clean(cells[mapping.description])
    if (mapping.extraDescription >= 0) {
      const extra = clean(cells[mapping.extraDescription])
      if (extra && extra !== description) description = description ? `${description} · ${extra}` : extra
    }
    description = description.slice(0, 200) || 'Bank transaction'

    let amount = 0
    let type: TransactionType | null = null
    const hint = mapping.direction >= 0 ? directionOf(cells[mapping.direction]) : null
    // the amount text as written, for explaining why it couldn't be read
    let amountText = ''
    let amountUnreadable = false

    if (mapping.mode === 'split') {
      const outText = clean(cells[mapping.moneyOut])
      const inText = clean(cells[mapping.moneyIn])
      const out = parseAmount(outText)
      const into = parseAmount(inText)
      amountText = outText || inText
      amountUnreadable = Boolean((outText && !out) || (inText && !into))
      if (out && out.value > 0) {
        amount = out.value
        type = 'expense'
      } else if (into && into.value > 0) {
        amount = into.value
        type = 'income'
      }
    } else {
      amountText = clean(cells[mapping.amount])
      const a = parseAmount(amountText)
      amountUnreadable = Boolean(amountText && !a)
      if (a && a.value > 0) {
        amount = a.value
        if (a.marker) type = a.marker === 'cr' ? 'income' : 'expense'
        else if (hint) type = hint
        else if (mapping.mode === 'unsigned') type = 'expense'
        else type = a.negative === mapping.negativeIsOut ? 'expense' : 'income'
      }
    }

    if (date && type && amount > 0) {
      rows.push({ line, date, description, amount, type })
      return
    }

    // not a transaction as it stands: say why, in words
    const dateText = clean(cells[mapping.date])
    // "Opening balance" or "Total" with no date or no amount: a statement line, not a transaction
    const summary = (!date || !amountText) && SUMMARY_LINE.test(cells.join(' '))
    let reason: string
    if (summary) reason = 'A balance or total line, not a transaction'
    else if (!dateText) reason = 'No date'
    else if (!date) reason = `“${dateText}” isn’t a date Monetra can read`
    else if (amountUnreadable) reason = `“${amountText}” isn’t an amount Monetra can read`
    else if (!amountText) reason = 'No amount'
    else reason = 'The amount is 0'
    const raw = cells.filter(Boolean).join(' · ')
    skipped.push({
      line,
      reason,
      raw: raw.length > 90 ? raw.slice(0, 89) + '…' : raw,
      summary,
      date: date ?? '',
      description,
      amount: amount > 0 ? amount : null,
      type: type ?? hint ?? 'expense',
    })
  })

  return { rows, skipped }
}

// ---------- duplicate protection ----------

// Same date, amount, direction and description = same transaction. A counter keeps two
// identical purchases on the same day (two teh tarik) as two rows instead of one.
export async function withImportHashes<T extends ParsedRow>(rows: T[]): Promise<(T & { hash: string })[]> {
  const seen = new Map<string, number>()
  return Promise.all(
    rows.map(async (row) => {
      const base = `${row.date}|${row.amount.toFixed(2)}|${row.type}|${row.description.toLowerCase()}`
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${base}|${n}`))
      const hash = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
      return { ...row, hash }
    })
  )
}
