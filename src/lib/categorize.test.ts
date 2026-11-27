import { describe, expect, it } from 'vitest'
import { findRule, normalizeKeyword } from './categorize'
import type { CategoryRule } from './types'

const rule = (keyword: string, category_id: string, priority = 0): CategoryRule => ({ id: keyword, keyword, category_id, priority })

// A slice of the defaults every new account gets (supabase/schema.sql)
const defaults = [
  rule('PETRONAS', 'petrol'),
  rule('SHELL', 'petrol'),
  rule('JAYA GROCER', 'groceries'),
  rule('LOTUS', 'groceries'),
  rule('99 SPEEDMART', 'groceries'),
  rule('GRABFOOD', 'food', 10),
  rule('MCDONALD', 'food'),
  rule('KFC', 'food'),
  rule('TNB', 'bills'),
  rule('DIGI', 'bills'),
  rule('U MOBILE', 'bills'),
  rule('ASTRO', 'bills'),
  rule('GRAB', 'transport', 1),
  rule('MRT', 'transport'),
  rule('PLUS', 'transport'),
]

const categoryFor = (description: string, rules = defaults) => findRule(description, rules)?.category_id

describe('findRule', () => {
  it('matches a keyword anywhere in the description', () => {
    expect(categoryFor('PETRONAS SETIA ALAM')).toBe('petrol')
    expect(categoryFor('POS PURCHASE TNB BILL PAYMENT')).toBe('bills')
  })

  it('ignores case and extra spaces', () => {
    expect(categoryFor('  petronas   setia alam ')).toBe('petrol')
    expect(categoryFor('jaya    grocer the gardens')).toBe('groceries')
  })

  it('matches whole words only', () => {
    expect(categoryFor('DIGI POSTPAID')).toBe('bills')
    expect(categoryFor('DIGITAL OCEAN')).toBeUndefined()
    expect(categoryFor('SMRT TRAIN SG')).toBeUndefined()
    expect(categoryFor('MENU MOBILE APP')).toBeUndefined() // not "U MOBILE"
  })

  it('allows a plural or possessive ending', () => {
    expect(categoryFor('MCDONALDS BANGSAR')).toBe('food')
    expect(categoryFor("LOTUS'S KOTA DAMANSARA")).toBe('groceries')
  })

  it('treats punctuation as a word break', () => {
    expect(categoryFor('GRAB*RIDE 8KM')).toBe('transport')
    expect(categoryFor('KFC-SS15')).toBe('food')
    expect(categoryFor('SHELL/PJ')).toBe('petrol')
  })

  it('picks the higher priority rule when several match', () => {
    // GRABFOOD (10) beats KFC (0); GRAB doesn't match "GRABFOOD" at all
    expect(categoryFor('GRABFOOD KFC MID VALLEY')).toBe('food')
    // GRAB (1) beats MRT (0)
    expect(categoryFor('GRAB MRT FEEDER')).toBe('transport')
  })

  it('picks the longer, more specific keyword when priorities tie', () => {
    expect(categoryFor('ASTRO PLUS')).toBe('bills') // ASTRO is longer than PLUS
    expect(findRule('ASTRO PLUS', [...defaults].reverse())?.category_id).toBe('bills') // regardless of order
  })

  it('handles keywords with numbers and regex characters', () => {
    expect(categoryFor('99 SPEEDMART KLANG')).toBe('groceries')
    const rules = [rule('7-ELEVEN', 'food'), rule('MR. DIY', 'home'), rule('A+B (M)', 'misc')]
    expect(categoryFor('7-ELEVEN SS2', rules)).toBe('food')
    expect(categoryFor('MR. DIY SUNWAY', rules)).toBe('home')
    expect(categoryFor('MRX DIY', rules)).toBeUndefined() // "." is not a wildcard
    expect(categoryFor('A+B (M) SDN BHD', rules)).toBe('misc')
  })

  it('normalizes the keyword too', () => {
    expect(categoryFor('PETRONAS KL', [rule('  petronas ', 'petrol')])).toBe('petrol')
  })

  it('finds nothing for a blank description or no rules', () => {
    expect(findRule('', defaults)).toBeUndefined()
    expect(findRule('   ', defaults)).toBeUndefined()
    expect(findRule('PETRONAS', [])).toBeUndefined()
  })

  it('never lets a blank keyword match everything', () => {
    expect(categoryFor('SOME SHOP KL', [rule('', 'food'), rule('   ', 'food', 99)])).toBeUndefined()
    expect(categoryFor('PETRONAS KL', [rule('', 'food', 99), rule('PETRONAS', 'petrol')])).toBe('petrol')
  })

  it('does not change the rules it is given', () => {
    const rules = [rule('KFC', 'food'), rule('GRABFOOD', 'food', 10)]
    findRule('GRABFOOD KFC', rules)
    expect(rules.map((r) => r.keyword)).toEqual(['KFC', 'GRABFOOD'])
  })
})

describe('normalizeKeyword', () => {
  it('uppercases and collapses spaces', () => {
    expect(normalizeKeyword('  jaya   grocer ')).toBe('JAYA GROCER')
  })
})
