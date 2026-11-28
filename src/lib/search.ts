import type { TransactionType } from './types'

// Transaction search, shared by the list and the CSV export so both always match.

export type SearchFilters = {
  q: string // description contains this (any case), or the exact amount if it's a number
  category: string // '' = any, 'none' = Uncategorized, otherwise a category id
  type: '' | TransactionType
  from?: string // yyyy-MM-dd, inclusive
  to?: string
}

// "%" and "_" are wildcards in LIKE patterns; escape them so they're searched literally
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

const AMOUNT = /^(?:rm)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/i

// "12.50", "RM 12.50", "rm1,234.5", "12" → the amount; anything else → null
export function amountFromQuery(q: string): { amount: number; text: string } | null {
  const m = AMOUNT.exec(q.trim())
  if (!m) return null
  const text = m[1].replace(/,/g, '')
  const amount = Number(text)
  return amount > 0 ? { amount, text } : null
}

// The parts of the query builder this needs; Supabase's builders have them all
type Builder = {
  ilike(column: string, pattern: string): Builder
  or(filters: string): Builder
  is(column: string, value: null): Builder
  eq(column: string, value: string): Builder
  gte(column: string, value: string): Builder
  lte(column: string, value: string): Builder
}

// Adds the filters to a Supabase select. Typing a number finds that exact amount as well as
// descriptions containing it ("12.50" finds RM 12.50 and "Parking 12.50").
export function applySearch<Q>(query: Q, f: Partial<SearchFilters>): Q {
  let b = query as unknown as Builder
  const q = f.q?.trim() ?? ''
  const amount = amountFromQuery(q)
  // the amount text is only digits and a dot, so it's safe inside PostgREST's or=(…) syntax
  if (amount) b = b.or(`description.ilike.%${amount.text}%,amount.eq.${amount.text}`)
  else if (q) b = b.ilike('description', `%${likeEscape(q)}%`)
  if (f.category === 'none') b = b.is('category_id', null)
  else if (f.category) b = b.eq('category_id', f.category)
  if (f.type) b = b.eq('type', f.type)
  if (f.from) b = b.gte('date', f.from)
  if (f.to) b = b.lte('date', f.to)
  return b as unknown as Q
}
