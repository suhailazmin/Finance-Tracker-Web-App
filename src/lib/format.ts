import { amountsHidden } from './privacy'

// Same width whatever the amount, so a hidden figure doesn't hint at its size
export const HIDDEN_RM = 'RM ••••'

const rm = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' })

// formatRM(1234.5) -> "RM 1,234.50" (or "RM ••••" when amounts are hidden)
export const formatRM = (amount: number) => (amountsHidden() ? HIDDEN_RM : rm.format(amount))

const compact = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 })

// Income minus spending. It isn't money in the bank, so it's never called a balance:
// "Monthly surplus" when you kept some, "Monthly shortfall" (shown without a minus) when you spent more
export const surplusLabel = (net: number, { monthly = true } = {}) =>
  net < 0 ? (monthly ? 'Monthly shortfall' : 'Shortfall') : monthly ? 'Monthly surplus' : 'Surplus'

// For chart axes: formatRMCompact(1500) -> "RM1.5K" (or "RM ••••" when amounts are hidden)
export const formatRMCompact = (amount: number) => (amountsHidden() ? HIDDEN_RM : `RM${compact.format(amount)}`)
