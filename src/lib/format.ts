const rm = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' })

// formatRM(1234.5) -> "RM 1,234.50"
export const formatRM = (amount: number) => rm.format(amount)

const compact = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 })

// For chart axes: formatRMCompact(1500) -> "RM1.5K"
export const formatRMCompact = (amount: number) => `RM${compact.format(amount)}`
