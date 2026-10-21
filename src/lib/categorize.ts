import type { CategoryRule } from './types'

const normalize = (text: string) => text.toUpperCase().replace(/\s+/g, ' ').trim()

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A keyword must match whole words, so "DIGI" matches "DIGI POSTPAID" but not
// "DIGITAL OCEAN", and "MRT" doesn't match "SMRT". A trailing S is allowed,
// so "MCDONALD" still matches "MCDONALDS".
function matches(description: string, keyword: string) {
  const pattern = new RegExp(`(^|[^A-Z0-9])${escapeRegExp(normalize(keyword))}S?($|[^A-Z0-9])`)
  return pattern.test(description)
}

// Returns the best matching rule: highest priority first (GRABFOOD before GRAB),
// then the longest keyword (more specific).
export function findRule(description: string, rules: CategoryRule[]): CategoryRule | undefined {
  const text = normalize(description)
  if (!text) return undefined
  return [...rules]
    .sort((a, b) => b.priority - a.priority || b.keyword.length - a.keyword.length)
    .find((r) => matches(text, r.keyword))
}

export const normalizeKeyword = normalize
