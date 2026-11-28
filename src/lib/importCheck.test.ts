import { describe, expect, it } from 'vitest'
import { checkDuplicates, groupImports, type Existing, type ImportedRow } from './importCheck'
import { buildRows, guessMapping, readCsv } from './importCsv'

const row = (line: number, hash: string, date = '2026-11-05', amount = 15.3, type: 'expense' | 'income' = 'expense') => ({ line, hash, date, amount, type })
const existing = (over: Partial<Existing>): Existing => ({ date: '2026-11-05', amount: 15.3, type: 'expense', description: 'Grab ride', import_hash: null, ...over })

describe('checkDuplicates', () => {
  it('marks a line imported before as an exact duplicate', () => {
    const checks = checkDuplicates([row(2, 'h1')], [existing({ import_hash: 'h1' })])
    expect(checks.get(2)).toEqual({ kind: 'exact' })
  })

  it('flags a possible duplicate added another way: same date, amount and direction', () => {
    const typed = existing({ description: 'Grab ride' })
    const checks = checkDuplicates([row(2, 'h1')], [typed])
    expect(checks.get(2)).toEqual({ kind: 'possible', match: typed })
  })

  it('needs the date, amount and direction all to match', () => {
    const checks = checkDuplicates(
      [row(2, 'a'), row(3, 'b'), row(4, 'c')],
      [existing({ date: '2026-11-06' }), existing({ amount: 15.31 }), existing({ type: 'income' })]
    )
    expect(checks.size).toBe(0)
  })

  it('lets each existing transaction explain only one line', () => {
    // two identical RM 15.30 rides in the file, one already typed in: only one is suspect
    const checks = checkDuplicates([row(2, 'a'), row(3, 'b')], [existing({})])
    expect(checks.get(2)?.kind).toBe('possible')
    expect(checks.has(3)).toBe(false)
  })

  it('does not count an exact duplicate again as a possible one', () => {
    const checks = checkDuplicates([row(2, 'h1'), row(3, 'h2')], [existing({ import_hash: 'h1' })])
    expect(checks.get(2)).toEqual({ kind: 'exact' })
    expect(checks.has(3)).toBe(false)
  })
})

describe('groupImports', () => {
  const imported = (source: string, created_at: string, date: string, amount: number, type: 'income' | 'expense' = 'expense'): ImportedRow => ({
    source,
    created_at,
    date,
    amount,
    type,
  })

  it('groups rows saved together into one import, newest import first', () => {
    const batches = groupImports([
      imported('maybank', '2026-11-01T10:00:00.100Z', '2026-10-03', 12.1),
      imported('maybank', '2026-11-01T10:00:00.100Z', '2026-10-30', 5200, 'income'),
      imported('maybank', '2026-11-01T10:00:01.400Z', '2026-10-15', 7.9), // second batch of 500, a moment later
      imported('tng', '2026-11-20T08:30:00Z', '2026-11-10', 15.3),
    ])
    expect(batches.map((b) => [b.source, b.count])).toEqual([
      ['tng', 1],
      ['maybank', 3],
    ])
    expect(batches[1]).toMatchObject({ from: '2026-10-03', to: '2026-10-30', income: 5200, expenses: 20, firstCreated: '2026-11-01T10:00:00.100Z', lastCreated: '2026-11-01T10:00:01.400Z' })
  })

  it('splits two imports from the same bank made at different times', () => {
    const batches = groupImports([
      imported('cimb', '2026-10-01T09:00:00Z', '2026-09-10', 1),
      imported('cimb', '2026-11-01T09:00:00Z', '2026-10-10', 1),
    ])
    expect(batches).toHaveLength(2)
  })

  it('is empty without imports', () => {
    expect(groupImports([])).toEqual([])
  })
})

describe('buildRows: lines that are skipped say why', () => {
  const csv = [
    'Date,Description,Amount',
    '01/11/2026,Opening balance,',
    '02/11/2026,GRAB RIDE,-15.30',
    ',Coffee,-8.00',
    '31/02/2026,Typo date,-5.00',
    '03/11/2026,Odd amount,abc',
    '04/11/2026,No amount,',
    '05/11/2026,Zero,0.00',
    'Total,,-28.30',
  ].join('\n')
  const sheet = readCsv(csv)!
  const { rows, skipped } = buildRows(sheet, guessMapping(sheet))
  const reasons = Object.fromEntries(skipped.map((s) => [s.line, s.reason]))

  it('reads the good line', () => {
    expect(rows).toEqual([{ line: 3, date: '2026-11-02', description: 'GRAB RIDE', amount: 15.3, type: 'expense' }])
  })

  it('explains each skipped line', () => {
    expect(reasons).toEqual({
      2: 'A balance or total line, not a transaction',
      4: 'No date',
      5: '“31/02/2026” isn’t a date Monetra can read',
      6: '“abc” isn’t an amount Monetra can read',
      7: 'No amount',
      8: 'The amount is 0',
      9: 'A balance or total line, not a transaction',
    })
  })

  it('keeps what could be read, so the line can be fixed', () => {
    const coffee = skipped.find((s) => s.line === 4)!
    expect(coffee).toMatchObject({ date: '', description: 'Coffee', amount: 8, type: 'expense', summary: false })
    expect(skipped.find((s) => s.line === 9)?.summary).toBe(true)
  })
})
