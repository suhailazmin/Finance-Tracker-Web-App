import { describe, expect, it } from 'vitest'
import { friendlyError } from './errors'

describe('friendlyError', () => {
  it('is empty when there is no error', () => {
    expect(friendlyError(null)).toBe('')
    expect(friendlyError(undefined)).toBe('')
    expect(friendlyError({ message: '' })).toBe('')
  })

  it('explains connection problems and what to do', () => {
    expect(friendlyError({ message: 'TypeError: Failed to fetch' })).toMatch(/offline.*try again/i)
    expect(friendlyError({ message: 'You’re offline: try again when you’re connected.' })).toMatch(/check your internet/i)
  })

  it('replaces database wording with plain language', () => {
    expect(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "categories_user_id_name_key"' })).toMatch(
      /already exists/
    )
    expect(friendlyError({ code: '23514', message: 'new row violates check constraint "budgets_limit_amount_check"' })).toMatch(/above RM 0/)
    expect(friendlyError({ code: '22003', message: 'numeric field overflow' })).toMatch(/too large/)
    expect(friendlyError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/sign in again/)
    expect(friendlyError({ code: 'PGRST301', message: 'JWT expired' })).toMatch(/sign-in has expired/)
  })

  it('never shows raw database text for known errors', () => {
    const text = friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint' })
    expect(text).not.toMatch(/constraint|duplicate key/)
  })

  it('still says what to do for unknown errors, keeping the original for reference', () => {
    const text = friendlyError({ message: 'Something odd' })
    expect(text).toMatch(/^Something went wrong\. Try again/)
    expect(text).toContain('(Something odd)')
  })

  it('can keep readable sign-in messages as they are', () => {
    expect(friendlyError({ message: 'Password should be at least 8 characters.' }, { keepUnknown: true })).toBe(
      'Password should be at least 8 characters.'
    )
    // known problems are still explained
    expect(friendlyError({ message: 'Failed to fetch' }, { keepUnknown: true })).toMatch(/offline/)
  })

  it('accepts a plain message string', () => {
    expect(friendlyError('duplicate key value')).toMatch(/already exists/)
  })
})
