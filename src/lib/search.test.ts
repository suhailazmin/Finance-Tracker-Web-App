import { describe, expect, it } from 'vitest'
import { amountFromQuery, applySearch, likeEscape } from './search'

// records the calls a Supabase query builder would receive
function recorder() {
  const calls: string[] = []
  const b = new Proxy(
    {},
    {
      get: (_, method: string) =>
        (...args: unknown[]) => {
          calls.push(`${method}(${args.map((a) => JSON.stringify(a)).join(', ')})`)
          return b
        },
    }
  )
  return { b, calls }
}
const run = (f: Parameters<typeof applySearch>[1]) => {
  const { b, calls } = recorder()
  applySearch(b, f)
  return calls
}

describe('amountFromQuery', () => {
  it('reads plain amounts, with or without RM, commas and cents', () => {
    expect(amountFromQuery('12.50')).toEqual({ amount: 12.5, text: '12.50' })
    expect(amountFromQuery('RM 12.50')).toEqual({ amount: 12.5, text: '12.50' })
    expect(amountFromQuery('rm12')).toEqual({ amount: 12, text: '12' })
    expect(amountFromQuery(' 1,234.5 ')).toEqual({ amount: 1234.5, text: '1234.5' })
  })

  it('treats anything else as text', () => {
    expect(amountFromQuery('Grab')).toBeNull()
    expect(amountFromQuery('99 Speedmart')).toBeNull()
    expect(amountFromQuery('12.505')).toBeNull()
    expect(amountFromQuery('1,23')).toBeNull()
    expect(amountFromQuery('0')).toBeNull()
    expect(amountFromQuery('')).toBeNull()
  })
})

describe('applySearch', () => {
  it('searches descriptions for text, escaping LIKE wildcards', () => {
    expect(run({ q: ' grab ' })).toEqual(['ilike("description", "%grab%")'])
    expect(run({ q: '50%_off' })).toEqual([`ilike("description", ${JSON.stringify('%' + likeEscape('50%_off') + '%')})`])
  })

  it('finds an exact amount, or descriptions containing the number', () => {
    expect(run({ q: 'RM 1,234.50' })).toEqual(['or("description.ilike.%1234.50%,amount.eq.1234.50")'])
  })

  it('combines every filter', () => {
    expect(run({ q: 'grab', category: 'transport', type: 'expense', from: '2026-11-01', to: '2026-11-15' })).toEqual([
      'ilike("description", "%grab%")',
      'eq("category_id", "transport")',
      'eq("type", "expense")',
      'gte("date", "2026-11-01")',
      'lte("date", "2026-11-15")',
    ])
  })

  it('finds uncategorized transactions', () => {
    expect(run({ category: 'none' })).toEqual(['is("category_id", null)'])
  })

  it('leaves out empty filters, including an open-ended date range', () => {
    expect(run({ q: '  ', category: '', type: '', from: '2026-01-01' })).toEqual(['gte("date", "2026-01-01")'])
    expect(run({})).toEqual([])
  })
})
